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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, Download, BarChartOutlined, Storage } from '@mui/icons-material';
import { useData } from '../context/DataContext';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { dispatchMainKeyArray } from '../types/KeyMaps';

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

interface FileAnalysis {
  id: string;
  fileName: string;
  result: AnalysisResult;
  customHeaders: Record<string, string>;
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
  const [analysisResults, setAnalysisResults] = useState<FileAnalysis[]>(() => {
    const savedResults = localStorage.getItem('analysisResults');
    return savedResults ? JSON.parse(savedResults) : [];
  });
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(() => {
    const savedIndex = localStorage.getItem('currentFileIndex');
    return savedIndex ? parseInt(savedIndex, 10) : 0;
  });
  const [selectedGroupColumns, setSelectedGroupColumns] = useState<string[]>([]);
  const [aggregateColumn, setAggregateColumn] = useState<string>('');
  const [aggregateFunction, setAggregateFunction] = useState<string>('sum');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false);

  useEffect(() => {
    console.log(`localStorage.getItem('currentFileIndex'): ${localStorage.getItem('currentFileIndex')}`);
    const savedCustomHeaders = localStorage.getItem('customHeaders');
    
    if (savedCustomHeaders) {
      try {
        setCustomHeaders(JSON.parse(savedCustomHeaders));
      } catch (error) {
        console.error('Error parsing saved custom headers:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('analysisResults', JSON.stringify(analysisResults));
  }, [analysisResults]);
  
  useEffect(() => {
    localStorage.setItem('currentFileIndex', currentFileIndex.toString());
    console.log(`localStorage.getItem('currentFileIndex'): ${currentFileIndex}`);

    console.log(`currentFileIndex int useeffect([currentFileIndex]) to : ${currentFileIndex}`);
  }, [currentFileIndex]);

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

      console.log('Analysis response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Analysis failed');
      }

      const newFileAnalysis: FileAnalysis = {
        id: Date.now().toString(),
        fileName: `File ${analysisResults.length + 1}`,
        result: {
          data: response.data.data,
          summary: {
            totalGroups: response.data.summary.totalGroups,
            groupBy: response.data.summary.groupBy,
            aggregateColumn: response.data.summary.aggregateColumn,
            aggregateFunction: response.data.summary.aggregateFunction
          }
        },
        customHeaders: { ...customHeaders }
      };

      console.log('New file analysis:', newFileAnalysis);

      // First update analysisResults
      const newResults = [...analysisResults, newFileAnalysis];
      setAnalysisResults(newResults);
      
      // Then update currentFileIndex
      const newIndex = newResults.length - 1;
      setCurrentFileIndex(newIndex);

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
    if (!analysisResults[currentFileIndex]?.result?.data) {
      console.log('No result data available');
      return [];
    }

    const result = analysisResults[currentFileIndex].result;
    console.log('Processing data:', result);

    const groupedData: GroupedData[] = [];
    const groupByColumns = result.summary.groupBy;

    // Group the data by the first level
    const firstLevelGroups = new Map<string, any[]>();
    result.data.forEach(item => {
      const key = item[groupByColumns[0]];
      if (!firstLevelGroups.has(key)) {
        firstLevelGroups.set(key, []);
      }
      firstLevelGroups.get(key)!.push(item);
    });

    // Process each first level group
    firstLevelGroups.forEach((items, key) => {
      const totalAggregate = items.reduce((sum, item) => sum + Number(item.aggregate_value), 0);
      const totalCount = items.reduce((sum, item) => sum + Number(item.count), 0);

      groupedData.push({
        primaryKey: key,
        items,
        totalAggregate,
        totalCount
      });
    });

    console.log('Processed data:', groupedData);
    return groupedData;
  }, [analysisResults, currentFileIndex]);

  const renderTable = () => {
    if (!analysisResults[currentFileIndex]?.result?.data || !processedData.length) {
      console.log('Cannot render table - missing data');
      return null;
    }

    const result = analysisResults[currentFileIndex].result;
    const groupByColumns = result.summary.groupBy;
    const aggregateColumn = result.summary.aggregateColumn;
    const aggregateFunction = result.summary.aggregateFunction;

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
            {processedData.map((group, groupIndex) => (
              <React.Fragment key={group.primaryKey}>
                {group.items.map((item, itemIndex) => (
                  <TableRow key={`${groupIndex}-${itemIndex}`}>
                    {itemIndex === 0 && (
                      <TableCell 
                        rowSpan={group.items.length} 
                        sx={{ backgroundColor: '#f5f5f5' }}
                      >
                        {group.primaryKey}
                      </TableCell>
                    )}
                    {groupByColumns.slice(1).map((col, colIndex) => (
                      <TableCell key={colIndex}>{item[col]}</TableCell>
                    ))}
                    <TableCell align="right">{item.count}</TableCell>
                    <TableCell align="right">{Number(item.aggregate_value).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const handleExport = async () => {
    if (analysisResults.length === 0) return;

    const tempfiles = analysisResults.map(fileAnalysis => ({
      data: fileAnalysis.result.data,
      summary: fileAnalysis.result.summary,
      customHeaders: fileAnalysis.customHeaders,
      fileName: fileAnalysis.fileName
    }));

    try {
      const response = await api.post('/export-analysis', {
        files: tempfiles
      }, {
        responseType: 'blob'
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'combined_analysis_results.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleNewDataEntry = async () => {
    try {
      // Clear existing data from the database
      await api.delete('/clear-data');
      
      // Clear localStorage
      localStorage.removeItem('analysisResults');
      localStorage.removeItem('currentFileIndex');
      localStorage.removeItem('customHeaders');
      localStorage.removeItem('uploadedFileNames');
      
      // Reset state
      setAnalysisResults([]);
      setCurrentFileIndex(0);
      setCustomHeaders({});
      
      // Navigate to upload page
      navigate('/');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  const getColumnLabel = (column: string) => {
    // Check if there's a "پخش" column in the data
    const pooshColumn = data.find(row => 'پخش' in row);
    if (pooshColumn) {
      const pooshValue = pooshColumn['پخش'];
      // Check if the value exists in dispatchMainKeyArray
      if (pooshValue && dispatchMainKeyArray[pooshValue]) {
        // If column exists in the array, add asterisk
        if (dispatchMainKeyArray[pooshValue].includes(column)) {
          return `** ${column} **`;
        }
      }
    }
    return column;
  };

  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>
        Data Analysis {analysisResults[currentFileIndex]?.fileName && `(${analysisResults[currentFileIndex].fileName})`}
      </Typography>
      
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
                      <Chip key={value} label={getColumnLabel(value)} />
                    ))}
                  </Box>
                )}
              >
                {availableColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {getColumnLabel(column)}
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

          <Box sx={{ width: '100%', mt: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleAnalyze}
              disabled={loading || selectedGroupColumns.length === 0 || !aggregateColumn}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              <BarChartOutlined sx={{ mr: 1 }} />
              Analyze
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setConfirmDialogOpen(true)}
            >
              <Storage sx={{ mr: 1 }} />
              Reset Data Entry
            </Button>
          </Box>
        </Box>
      </Paper>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Clear Existing Data</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Warning: This action will clear all existing data from the database. 
            You will need to upload a new Excel file to proceed with analysis.
            Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNewDataEntry} color="error" variant="contained">
            Clear Data & Continue
          </Button>
        </DialogActions>
      </Dialog>

      {analysisResults.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Analysis Results - {analysisResults[currentFileIndex]?.fileName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Groups: {analysisResults[currentFileIndex]?.result.summary.totalGroups}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
              >
                Export to Excel
              </Button>
              <Button
                variant="contained"
                onClick={() => setAddFileDialogOpen(true)}
              >
                Add Another File
              </Button>
            </Stack>
          </Stack>

          {renderTable()}
        </Paper>
      )}

      <Dialog
        open={addFileDialogOpen}
        onClose={() => setAddFileDialogOpen(false)}
      >
        <DialogTitle>Add Another File</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You can add another file to analyze. The current analysis will be preserved.
            Would you like to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddFileDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setAddFileDialogOpen(false);
              navigate('/');
            }} 
            color="primary" 
            variant="contained"
          >
            Add File
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataAnalysis; 