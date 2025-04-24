import React, { FC, useState, useMemo, useEffect } from 'react';
import { JSX } from 'react';
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
  Stack,
  TextField
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

interface GroupedData {
  primaryKey: string;
  items: Array<{
    [key: string]: any;
    aggregate_value: number;
    count: number;
  }>;
  totalAggregate: number;
  totalCount: number;
}

interface NestedRow {
  id: string;
  value: any;
  children?: NestedRow[];
  aggregate_value: number;
  count: number;
  level: number;
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
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/headers');
        if (response.data && response.data.headers) {
          setAvailableColumns(response.data.headers);
          // Initialize custom headers with default values
          const defaultHeaders = response.data.headers.reduce((acc: Record<string, string>, header: string) => {
            acc[header] = header;
            return acc;
          }, {});
          setCustomHeaders(defaultHeaders);
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

  const handleHeaderChange = (originalHeader: string, newValue: string) => {
    setCustomHeaders(prev => ({
      ...prev,
      [originalHeader]: newValue
    }));
    console.log(customHeaders);
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

  const processNestedData = (data: any[], groupColumns: string[]): NestedRow[] => {
    if (groupColumns.length === 0) return [];

    const groups = new Map<string, any>();
    
    // Group by the first column
    data.forEach(item => {
      const key = item[groupColumns[0]];
      if (!groups.has(key)) {
        groups.set(key, {
          items: [],
          aggregate_value: 0,
          count: 0
        });
      }
      const group = groups.get(key);
      group.items.push(item);
      group.aggregate_value += item.aggregate_value;
      group.count += item.count;
    });

    // Convert to nested structure
    return Array.from(groups.entries()).map(([key, group]) => {
      const row: NestedRow = {
        id: key,
        value: key,
        aggregate_value: group.aggregate_value,
        count: group.count,
        level: 0
      };

      // If there are more grouping columns, process children recursively
      if (groupColumns.length > 1) {
        row.children = processNestedData(
          group.items,
          groupColumns.slice(1)
        ).map(child => ({
          ...child,
          id: `${row.id}-${child.id}`,
          level: child.level + 1
        }));
      }

      return row;
    });
  };

  const renderNestedRows = (rows: NestedRow[]) => {
    return rows.flatMap(row => {
      const hasChildren = row.children && row.children.length > 0;
      const isExpanded = expandedRows.has(row.id);
      
      const cells = [
        <TableRow key={row.id}>
          <TableCell
            sx={{
              paddingLeft: `${row.level * 24 + 16}px`,
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              fontWeight: row.level === 0 ? 'bold' : 'normal'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={() => toggleRow(row.id)}
                  sx={{ mr: 1 }}
                >
                  {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </IconButton>
              )}
              {row.value}
            </Box>
          </TableCell>
          <TableCell align="right">{formatValue(row.aggregate_value)}</TableCell>
          <TableCell align="right">{formatValue(row.count)}</TableCell>
        </TableRow>
      ];

      if (hasChildren && isExpanded) {
        cells.push(...renderNestedRows(row.children!));
      }

      return cells;
    });
  };

  const processedData = useMemo(() => {
    if (!analysisResult) return [];

    const groupedData: GroupedData[] = [];
    const groupByColumns = analysisResult.summary.groupBy;

    // Group the data by the first level
    const firstLevelGroups = new Map<string, any[]>();
    analysisResult.data.forEach(item => {
      const key = item[groupByColumns[0]];
      if (!firstLevelGroups.has(key)) {
        firstLevelGroups.set(key, []);
      }
      firstLevelGroups.get(key)!.push(item);
    });

    // Process each first level group
    firstLevelGroups.forEach((items, key) => {
      const totalAggregate = items.reduce((sum, item) => sum + item.aggregate_value, 0);
      const totalCount = items.reduce((sum, item) => sum + item.count, 0);

      groupedData.push({
        primaryKey: key,
        items,
        totalAggregate,
        totalCount
      });
    });

    return groupedData;
  }, [analysisResult]);

  const renderTable = () => {
    if (!analysisResult || !processedData.length) return null;

    const groupByColumns = analysisResult.summary.groupBy;
    const aggregateColumn = analysisResult.summary.aggregateColumn;
    const aggregateFunction = analysisResult.summary.aggregateFunction;

    // Process data to create groups
    const groupedByType = processedData.reduce((acc, item) => {
      const key = item.primaryKey;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {groupByColumns.map((column, index) => (
                <TableCell key={column} align="left">
                  <TextField
                    size="small"
                    value={customHeaders[column] || column}
                    onChange={(e) => handleHeaderChange(column, e.target.value)}
                    variant="standard"
                    fullWidth
                  />
                </TableCell>
              ))}
              <TableCell align="right">
                <TextField
                  size="small"
                  value={customHeaders['count'] || 'Count'}
                  onChange={(e) => handleHeaderChange('count', e.target.value)}
                  variant="standard"
                  fullWidth
                />
              </TableCell>
              <TableCell align="right">
                <TextField
                  size="small"
                  value={customHeaders[`${aggregateFunction}(${aggregateColumn})`] || `${aggregateFunction}(${aggregateColumn})`}
                  onChange={(e) => handleHeaderChange(`${aggregateFunction}(${aggregateColumn})`, e.target.value)}
                  variant="standard"
                  fullWidth
                />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groupedByType).map(([groupKey, items], groupIndex) => {
              const rowCount = items.reduce((sum, group) => sum + group.items.length, 0);
              
              return items.map((group, itemIndex) => (
                group.items.map((item: { [key: string]: any; count: number; aggregate_value: number }, subIndex: number) => (
                  <TableRow key={`${groupIndex}-${itemIndex}-${subIndex}`}>
                    {subIndex === 0 && itemIndex === 0 ? (
                      <TableCell 
                        rowSpan={rowCount} 
                        sx={{ backgroundColor: '#f5f5f5' }}
                      >
                        {groupKey}
                      </TableCell>
                    ) : null}
                    {groupByColumns.slice(1).map((col, colIndex) => (
                      <TableCell key={colIndex}>{item[col]}</TableCell>
                    ))}
                    <TableCell align="right">{item.count}</TableCell>
                    <TableCell align="right">{item.aggregate_value.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ));
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const handleExport = async () => {
    if (!analysisResult) return;

    try {
      const response = await api.post('/export-analysis', {
        groupBy: selectedGroupColumns,
        aggregateColumn,
        aggregateFunction,
        customHeaders
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