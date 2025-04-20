<?php

namespace App\Imports;

// use Maatwebsite\Excel\Concerns\ToCollection;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;


class RowsImport implements ToCollection
{
    public function collection(Collection $rows)
    {
        return $rows;
    }
}