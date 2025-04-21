import React, { FC, useState, useMemo, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Stack
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, Download } from '@mui/icons-material';
import { useData } from '../context/DataContext';
import api from '../api';

interface AnalysisResult {
  data: Array<{
    [key: string]: any;
    aggregate_value: number;
    count: number;
  }>;
  summary: {
    totalGroups: number;
    groupBy: string[];
    aggregateColumn: string;
    aggregateFunction: string;
  };
}

interface RowData {
  [key: string]: any;
  aggregate_value: number;
  count: number;
  subRows?: RowData[];
}

interface AnalysisItem {
  [key: string]: any;
  aggregate_value: number;
  count: number;
}

interface GroupedData {
  primaryKey: string;
  items: AnalysisItem[];
  totalAggregate: number;
  totalCount: number;
}

const DataAnalysis: FC = () => {
  const { data } = useData();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedGroupColumns, setSelectedGroupColumns] = useState<string[]>([]);
  const [aggregateColumn, setAggregateColumn] = useState<string>('');
  const [aggregateFunction, setAggregateFunction] = useState<string>('sum');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/headers');
        if (response.data && response.data.headers) {
          setAvailableColumns(response.data.headers);
        }
      } catch (error) {
        console.error('Error fetching headers:', error);
      }
    };

    fetchData();
  }, []);

  const handleGroupColumnChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedGroupColumns(typeof value === 'string' ? value.split(',') : value);
  };

  const handleAggregateColumnChange = (event: SelectChangeEvent) => {
    setAggregateColumn(event.target.value);
  };

  const handleAggregateFunctionChange = (event: SelectChangeEvent) => {
    setAggregateFunction(event.target.value);
  };

  const handleAnalyze = async () => {
    if (selectedGroupColumns.length === 0 || !aggregateColumn) return;

    setLoading(true);
    try {
      const response = await api.post('/analyze', {
        groupBy: selectedGroupColumns,
        aggregateColumn,
        aggregateFunction
      });

      setAnalysisResult(response.data);
      setExpandedRows(new Set());
    } catch (error) {
      console.error('Error analyzing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (rowId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowId)) {
      newExpandedRows.delete(rowId);
    } else {
      newExpandedRows.add(rowId);
    }
    setExpandedRows(newExpandedRows);
  };

  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  const renderRow = (row: any, level: number = 0, parentId?: string) => {
    const rowId = parentId ? `${parentId}-${row[selectedGroupColumns[level]]}` : row[selectedGroupColumns[0]];
    const hasSubRows = level < selectedGroupColumns.length - 1;
    const isExpanded = expandedRows.has(rowId);

    return (
      <React.Fragment key={rowId}>
        <TableRow>
          <TableCell>
            {hasSubRows && (
              <IconButton
                size="small"
                onClick={() => toggleRow(rowId)}
                sx={{ mr: 1 }}
              >
                {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
            )}
            <span style={{ paddingLeft: level * 20 }}>
              {row[selectedGroupColumns[level]]}
            </span>
          </TableCell>
          <TableCell align="right">{formatValue(row.aggregate_value)}</TableCell>
          <TableCell align="right">{formatValue(row.count)}</TableCell>
        </TableRow>
        {hasSubRows && isExpanded && row.subRows?.map((subRow: any) => 
          renderRow(subRow, level + 1, rowId)
        )}
      </React.Fragment>
    );
  };

  const processedData = useMemo<GroupedData[]>(() => {
    if (!analysisResult?.data || selectedGroupColumns.length === 0) return [];

    const groupedData = new Map<string, Omit<GroupedData, 'primaryKey'>>();
    const primaryColumn = selectedGroupColumns[0];

    analysisResult.data.forEach(row => {
      const primaryValue = row[primaryColumn];
      if (!groupedData.has(primaryValue)) {
        groupedData.set(primaryValue, {
          items: [],
          totalAggregate: 0,
          totalCount: 0
        });
      }
      
      const group = groupedData.get(primaryValue)!;
      group.items.push(row);
      group.totalAggregate += row.aggregate_value;
      group.totalCount += row.count;
    });

    return Array.from(groupedData.entries()).map(([key, value]) => ({
      primaryKey: key,
      ...value
    }));
  }, [analysisResult?.data, selectedGroupColumns]);

  const handleExport = async () => {
    if (!analysisResult) return;

    try {
      const response = await api.post('/export-analysis', {
        groupBy: selectedGroupColumns,
        aggregateColumn,
        aggregateFunction
      }, {
        responseType: 'blob'
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'analysis_results.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const renderTable = () => {
    if (!processedData.length) return null;

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>
                {selectedGroupColumns[0]}
              </TableCell>
              {selectedGroupColumns.slice(1).map(col => (
                <TableCell key={col} sx={{ fontWeight: 'bold' }}>
                  {col}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {analysisResult!.summary.aggregateFunction.toUpperCase()}(
                {analysisResult!.summary.aggregateColumn})
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Count
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processedData.map((group: GroupedData) => (
              <React.Fragment key={group.primaryKey}>
                {group.items.map((item: AnalysisItem, index: number) => (
                  <TableRow key={`${group.primaryKey}-${index}`}>
                    {index === 0 && (
                      <TableCell
                        rowSpan={group.items.length}
                        sx={{
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          fontWeight: 'bold',
                          borderRight: '1px solid rgba(224, 224, 224, 1)'
                        }}
                      >
                        {group.primaryKey}
                      </TableCell>
                    )}
                    {selectedGroupColumns.slice(1).map(col => (
                      <TableCell key={col}>
                        {item[col]}
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      {item.aggregate_value.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {item.count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>Data Analysis</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
            <FormControl fullWidth>
              <InputLabel>Group By Columns</InputLabel>
              <Select
                multiple
                value={selectedGroupColumns}
                label="Group By Columns"
                onChange={handleGroupColumnChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {availableColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
            <FormControl fullWidth>
              <InputLabel>Aggregate Column</InputLabel>
              <Select
                value={aggregateColumn}
                label="Aggregate Column"
                onChange={handleAggregateColumnChange}
              >
                {availableColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
            <FormControl fullWidth>
              <InputLabel>Aggregate Function</InputLabel>
              <Select
                value={aggregateFunction}
                label="Aggregate Function"
                onChange={handleAggregateFunctionChange}
              >
                <MenuItem value="sum">Sum</MenuItem>
                <MenuItem value="avg">Average</MenuItem>
                <MenuItem value="count">Count</MenuItem>
                <MenuItem value="min">Minimum</MenuItem>
                <MenuItem value="max">Maximum</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ width: '100%', mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleAnalyze}
              disabled={loading || selectedGroupColumns.length === 0 || !aggregateColumn}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Analyze
            </Button>
          </Box>
        </Box>
      </Paper>

      {analysisResult && (
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Analysis Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Groups: {analysisResult.summary.totalGroups}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
            >
              Export to Excel
            </Button>
          </Stack>

          {renderTable()}
        </Paper>
      )}
    </Box>
  );
};

export default DataAnalysis; 