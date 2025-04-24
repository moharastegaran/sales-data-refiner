<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\RowsImport;
use App\Exports\GroupedDataExport;
use App\Models\FilteredRow;
use Illuminate\Support\Facades\DB;

class ExcelController extends Controller
{
    public function upload(Request $req)
    {
        try {
            \Log::info('Starting file upload process');
            
            $req->validate(['file' => 'required|file|mimes:xlsx,csv']);
            \Log::info('File validation passed');

            $file = $req->file('file');
            \Log::info('File type: ' . $file->getMimeType());
            \Log::info('File size: ' . $file->getSize());

            $import = new RowsImport;
            \Log::info('Created RowsImport instance');

            try {
                $collection = Excel::toCollection($import, $file, null)
                    ->first();
                \Log::info('Successfully converted Excel to collection');
            } catch (\Exception $e) {
                \Log::error('Excel conversion error: ' . $e->getMessage());
                throw $e;
            }

            if (!$collection || $collection->isEmpty()) {
                \Log::warning('Empty collection after Excel conversion');
                return response()->json(['error' => 'File is empty or could not be processed'], 400);
            }

            $collection = $collection->take(1000);
            \Log::info('Collection size after limiting: ' . $collection->count());

            $headers = $collection->shift()->toArray();
            \Log::info('Headers extracted: ' . json_encode($headers));

            $rows = $collection
                ->map(function($row) use ($headers) {
                    try {
                        return array_combine($headers, $row->toArray());
                    } catch (\Exception $e) {
                        \Log::error('Row processing error: ' . $e->getMessage());
                        \Log::error('Headers: ' . json_encode($headers));
                        \Log::error('Row data: ' . json_encode($row->toArray()));
                        throw $e;
                    }
                })
                ->toArray();

            \Log::info('Successfully processed ' . count($rows) . ' rows');
            return response()->json($rows);
        } catch (\Exception $e) {
            \Log::error('Excel upload error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Error processing file',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function saveFiltered(Request $req)
    {
        $data = $req->validate(['rows' => 'required|array']);

        FilteredRow::truncate();
        foreach ($data['rows'] as $row) {
            FilteredRow::create(['data' => $row]);
        }

        return response()->json(['stored' => count($data['rows'])]);
    }

    public function groups(Request $req)
    {
        $p = $req->validate(['group_by' => 'required|string']);
        $g = $p['group_by'];
        $a = $req->input('agg_col');
        $op= $req->input('operator', '>');
        $th= $req->input('threshold', 0);

        $q = DB::table('filtered_rows')
            ->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.\"{$g}\"')) AS group_value")
            ->selectRaw('COUNT(*) AS count');

        if ($a) {
            $q->selectRaw("SUM(JSON_EXTRACT(data, '$.\"{$a}\"')) AS sum_{$a}")
              ->having("sum_{$a}", $op, $th);
        }

        return response()->json($q->groupBy('group_value')->get());
    }

    public function exportGroups(Request $req)
    {
        $p = $req->validate(['group_by' => 'required|string']);
        $g = $p['group_by'];
        $a = $req->input('agg_col');
        $op= $req->input('operator', '>');
        $th= $req->input('threshold', 0);

        $q = DB::table('filtered_rows')
            ->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.\"{$g}\"')) AS `{$g}`")
            ->selectRaw('COUNT(*) AS `count`');

        if ($a) {
            $q->selectRaw("SUM(JSON_EXTRACT(data, '$.\"{$a}\"')) AS `sum_{$a}`")
              ->having("sum_{$a}", $op, $th);
        }

        $groups = $q->groupBy($g)
                    ->get()
                    ->map(fn($r) => (array) $r)
                    ->toArray();

        $headings = $groups ? array_keys($groups[0]) : [$g, 'count', $a ? "sum_{$a}" : null];

        return Excel::download(new GroupedDataExport($groups, $headings), 'grouped_data.xlsx');
    }

    public function analyze(Request $req)
    {
        try {
            $params = $req->validate([
                'groupBy' => 'required|array',
                'groupBy.*' => 'required|string',
                'aggregateColumn' => 'required|string',
                'aggregateFunction' => 'required|string|in:sum,avg,count,min,max'
            ]);

            $query = DB::table('filtered_rows');

            // Build the group by columns
            $groupColumns = [];
            foreach ($params['groupBy'] as $column) {
                $groupColumns[] = "JSON_UNQUOTE(JSON_EXTRACT(data, '$.\"{$column}\"'))";
                $query->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.\"{$column}\"')) AS `{$column}`");
            }

            // Add aggregate value and count
            $query->selectRaw("{$params['aggregateFunction']}(JSON_EXTRACT(data, '$.\"{$params['aggregateColumn']}\"')) AS aggregate_value")
                  ->selectRaw('COUNT(*) AS count');

            // Group by all specified columns
            $query->groupBy($params['groupBy']);

            // Order by aggregate value in descending order
            $results = $query->orderBy('aggregate_value', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $results,
                'summary' => [
                    'totalGroups' => $results->count(),
                    'groupBy' => $params['groupBy'],
                    'aggregateColumn' => $params['aggregateColumn'],
                    'aggregateFunction' => $params['aggregateFunction']
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Analysis error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error performing analysis',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getHeaders()
    {
        try {
            // Get the first row from filtered_rows
            $firstRow = DB::table('filtered_rows')
                ->select('data')
                ->first();

            if (!$firstRow) {
                return response()->json(['headers' => []]);
            }

            // Decode the JSON data
            $data = json_decode($firstRow->data, true);
            
            // Get all keys from the data
            $headers = array_keys($data);

            return response()->json(['headers' => $headers]);
        } catch (\Exception $e) {
            \Log::error('Error fetching headers: ' . $e->getMessage());
            return response()->json([
                'error' => 'Error fetching headers',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function exportAnalysis(Request $req)
    {
        try {
            $params = $req->validate([
                'groupBy' => 'required|array',
                'groupBy.*' => 'required|string',
                'aggregateColumn' => 'required|string',
                'aggregateFunction' => 'required|string|in:sum,avg,count,min,max',
                'customHeaders' => 'nullable|array'
            ]);

            $query = DB::table('filtered_rows');

            // Build the group by columns
            $groupColumns = [];
            foreach ($params['groupBy'] as $column) {
                $groupColumns[] = "JSON_UNQUOTE(JSON_EXTRACT(data, '$.\"{$column}\"'))";
                $query->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.\"{$column}\"')) AS `{$column}`");
            }

            // Add aggregate value and count
            $query->selectRaw("{$params['aggregateFunction']}(JSON_EXTRACT(data, '$.\"{$params['aggregateColumn']}\"')) AS aggregate_value")
                  ->selectRaw('COUNT(*) AS count');

            // Group by all specified columns
            $query->groupBy($params['groupBy']);

            // Order by first group column and aggregate value
            $query->orderBy($params['groupBy'][0])
                  ->orderBy('aggregate_value', 'desc');

            $results = $query->get();

            // Create Excel file
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            // Set headers with custom names if provided
            $headers = [];
            foreach ($params['groupBy'] as $column) {
                $headers[] = $params['customHeaders'][$column] ?? $column;
            }
            $headers[] = $params['customHeaders']['count'] ?? 'Count';
            $headers[] = $params['customHeaders'][$params['aggregateFunction'] . '(' . $params['aggregateColumn'] . ')'] 
                        ?? $params['aggregateFunction'] . '(' . $params['aggregateColumn'] . ')';
            
            $sheet->fromArray($headers, null, 'A1');

            // Style headers
            $headerStyle = [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E0E0E0']
                ]
            ];
            $sheet->getStyle('A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers)) . '1')
                  ->applyFromArray($headerStyle);

            // Add data with merged cells for primary groups
            $row = 2;
            $currentGroup = null;
            $groupStartRow = $row;
            
            foreach ($results as $result) {
                $primaryGroupValue = $result->{$params['groupBy'][0]};
                
                // If we're starting a new group
                if ($currentGroup !== $primaryGroupValue) {
                    // Merge cells for previous group if exists
                    if ($currentGroup !== null && $row > $groupStartRow) {
                        $sheet->mergeCells("A{$groupStartRow}:A" . ($row - 1));
                    }
                    
                    $currentGroup = $primaryGroupValue;
                    $groupStartRow = $row;
                    
                    // Style primary group cell
                    $sheet->getStyle("A{$row}")->applyFromArray([
                        'font' => ['bold' => true],
                        'fill' => [
                            'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'F5F5F5']
                        ]
                    ]);
                }

                // Add row data
                $data = [];
                foreach ($params['groupBy'] as $column) {
                    $data[] = $result->$column;
                }
                $data[] = $result->count;
                $data[] = $result->aggregate_value;
                $sheet->fromArray($data, null, 'A' . $row);
                
                $row++;
            }

            // Merge cells for the last group
            if ($currentGroup !== null && $row > $groupStartRow) {
                $sheet->mergeCells("A{$groupStartRow}:A" . ($row - 1));
            }

            // Add borders
            $borderStyle = [
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN
                    ]
                ]
            ];
            $sheet->getStyle('A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers)) . ($row - 1))
                  ->applyFromArray($borderStyle);

            // Auto-size columns
            foreach (range('A', $sheet->getHighestColumn()) as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // Create Excel writer
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);

            // Save to temporary file
            $tempFile = tempnam(sys_get_temp_dir(), 'analysis_');
            $writer->save($tempFile);

            // Return file
            return response()->download($tempFile, 'analysis_results.xlsx')->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            \Log::error('Export error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error exporting analysis',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
