import React, { FC, useState, useMemo } from 'react';
import { Box, Button, Typography, CircularProgress, Chip, ThemeProvider, createTheme, Snackbar, Alert } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import DataFilter, { FilterCondition } from './DataFilter';

interface RowData {
  id: number;
  [key: string]: any;
}

interface ExcelUploaderProps {
  onData: (data: RowData[]) => void;
}

const ExcelUploader: FC<ExcelUploaderProps> = ({ onData }) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filteredRows, setFilteredRows] = useState<RowData[]>([]);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post<RowData[]>('upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data.map((row: RowData, idx: number) => ({ ...row, id: idx }));
      setRows(data);
      setFilteredRows(data);
      onData(data);
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error uploading file';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (filteredRows.length === 0) {
      setSnackbar({
        open: true,
        message: 'No data to save',
        severity: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = filteredRows.map(({ id, ...rest }) => rest);
      
      await api.post('save', { rows: dataToSave }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      setSnackbar({
        open: true,
        message: 'Data saved successfully',
        severity: 'success',
      });
      
      navigate('/analysis');
    } catch (error) {
      console.error('Error saving data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving data to database';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const applyFilters = (conditions: FilterCondition[]) => {
    if (!conditions.length || !conditions[0].column) {
      setFilteredRows(rows);
      return;
    }

    const filtered = rows.filter(row => {
      return conditions.every(condition => {
        const { column, operator, value } = condition;
        const cellValue = row[column];
        
        if (cellValue === undefined) return false;

        switch (operator) {
          case 'equals':
            return String(cellValue).toLowerCase() === String(value).toLowerCase();
          case 'contains':
            return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
          case 'in':
            if (!Array.isArray(value)) return false;
            return value.some(v => 
              String(cellValue).toLowerCase() === String(v).toLowerCase()
            );
          case '>':
            return Number(cellValue) > Number(value);
          case '<':
            return Number(cellValue) < Number(value);
          case '>=':
            return Number(cellValue) >= Number(value);
          case '<=':
            return Number(cellValue) <= Number(value);
          default:
            return true;
        }
      });
    });

    setFilteredRows(filtered);
  };

  const columns: GridColDef[] = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0])
      .filter((key) => key !== 'id')
      .map<GridColDef>((field) => ({
        field,
        headerName: field,
        flex: 1,
        filterable: true,
      } as GridColDef));
  }, [rows]);

  const rtlTheme = createTheme({
    direction: 'rtl',
  });

  return (
    <ThemeProvider theme={rtlTheme}>
      <Box p={4}>
        <Typography variant="h5">Upload & Preview</Typography>
        <Button 
          variant="contained" 
          component="label" 
          sx={{ mt: 2 }}
          disabled={loading}
        >
          Upload File
          <input
            hidden
            type="file"
            accept=".xlsx,.csv"
            onChange={handleUpload}
            disabled={loading}
          />
        </Button>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && rows.length > 0 && (
          <>
            <DataFilter
              columns={Object.keys(rows[0]).filter(key => key !== 'id')}
              onFilterChange={(conditions) => {
                setFilterConditions(conditions);
                applyFilters(conditions);
              }}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="subtitle1">Total Rows:</Typography>
              <Chip label={rows.length} color="primary" />
              {filteredRows.length !== rows.length && (
                <>
                  <Typography variant="subtitle1">Filtered Rows:</Typography>
                  <Chip label={filteredRows.length} color="secondary" />
                </>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveToDatabase}
                disabled={saving || filteredRows.length === 0}
                sx={{ ml: 'auto' }}
              >
                {saving ? <CircularProgress size={24} /> : 'Save to Database'}
              </Button>
            </Box>
            <Box sx={{ height: 500, mt: 2, direction: 'rtl' }}>
              <DataGrid
                rows={filteredRows}
                columns={columns}
                pageSizeOptions={[10, 25, 50]}
                filterMode="client"
                density="compact"
                sx={{
                  '& .MuiDataGrid-virtualScroller': {
                    left: 0
                  },
                  '& .MuiDataGrid-virtualScrollerContent': {
                    direction: 'rtl',
                  },
                  '& .MuiDataGrid-row:nth-of-type(odd)': {
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  },
                  '& .MuiDataGrid-cell': {
                    py: 1,
                    lineHeight: '1.5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    textAlign: 'right',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                  '& .MuiDataGrid-columnHeader': {
                    py: 1,
                    lineHeight: '1.5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    textAlign: 'right',
                  },
                  '& .MuiDataGrid-cellContent': {
                    lineHeight: '1.5',
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    textAlign: 'right',
                  },
                  '& .MuiDataGrid-columnSeparator': {
                    display: 'none',
                  },
                }}
              />
            </Box>
          </>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default ExcelUploader;