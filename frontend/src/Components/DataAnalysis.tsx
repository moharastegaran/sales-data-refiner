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
  TextField,
  Paper
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
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
    operator: string;
    threshold: number;
  };
}

const DataAnalysis: FC = () => {
  const { data } = useData();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedGroupColumns, setSelectedGroupColumns] = useState<string[]>([]);
  const [aggregateColumn, setAggregateColumn] = useState<string>('');
  const [aggregateFunction, setAggregateFunction] = useState<string>('sum');
  const [operator, setOperator] = useState<string>('>');
  const [threshold, setThreshold] = useState<string>('0');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

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

  const handleOperatorChange = (event: SelectChangeEvent) => {
    setOperator(event.target.value);
  };

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThreshold(event.target.value);
  };

  const handleAnalyze = async () => {
    if (selectedGroupColumns.length === 0 || !aggregateColumn) return;

    setLoading(true);
    try {
      const response = await api.post('/analyze', {
        groupBy: selectedGroupColumns,
        aggregateColumn,
        aggregateFunction,
        operator,
        threshold: parseFloat(threshold)
      });

      setAnalysisResult(response.data);
    } catch (error) {
      console.error('Error analyzing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = useMemo(() => {
    if (!analysisResult?.data.length) return [];
    
    const resultColumns: GridColDef[] = [];
    
    // Add grouping columns
    analysisResult.summary.groupBy.forEach(column => {
      resultColumns.push({
        field: column,
        headerName: column,
        flex: 1,
      });
    });

    // Add aggregate value and count
    resultColumns.push(
      {
        field: 'aggregate_value',
        headerName: `${analysisResult.summary.aggregateFunction}(${analysisResult.summary.aggregateColumn})`,
        flex: 1,
        type: 'number',
      },
      {
        field: 'count',
        headerName: 'Count',
        flex: 1,
        type: 'number',
      }
    );

    return resultColumns;
  }, [analysisResult]);

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

          <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
            <FormControl fullWidth>
              <InputLabel>Operator</InputLabel>
              <Select
                value={operator}
                label="Operator"
                onChange={handleOperatorChange}
              >
                <MenuItem value=">">Greater Than</MenuItem>
                <MenuItem value="<">Less Than</MenuItem>
                <MenuItem value=">=">Greater Than or Equal</MenuItem>
                <MenuItem value="<=">Less Than or Equal</MenuItem>
                <MenuItem value="=">Equal To</MenuItem>
                <MenuItem value="!=">Not Equal To</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: '1 1 30%', minWidth: 200 }}>
            <TextField
              fullWidth
              label="Threshold"
              type="number"
              value={threshold}
              onChange={handleThresholdChange}
            />
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
          <Typography variant="h6" gutterBottom>
            Analysis Results
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Groups: {analysisResult.summary.totalGroups}
          </Typography>
          <Box sx={{ height: 500, mt: 2 }}>
            <DataGrid
              rows={analysisResult.data}
              columns={columns}
              pageSizeOptions={[10, 25, 50]}
              density="compact"
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default DataAnalysis; 