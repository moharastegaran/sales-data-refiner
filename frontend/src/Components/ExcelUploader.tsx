import React, { FC, useState, useMemo, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Chip, ThemeProvider, createTheme, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import UploadFileIcon, { CloudUploadOutlined, Upload, Visibility } from '@mui/icons-material';
import api from '../api';
import DataFilter, { FilterCondition } from './DataFilter';
import { useData } from '../context/DataContext';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Checkbox } from '@mui/material';

interface RowData {
  id: number;
  [key: string]: any;
}

interface ExcelUploaderProps {
  onData: (data: RowData[]) => void;
}

const ExcelUploader: FC<ExcelUploaderProps> = ({ onData }) => {
  const { setData } = useData();
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filteredRows, setFilteredRows] = useState<RowData[]>([]);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [dateColumn, setDateColumn] = useState<string>('');
  const [dateDelimiter, setDateDelimiter] = useState<string>('');
  const [showDatePreview, setShowDatePreview] = useState(false);
  const [previewData, setPreviewData] = useState<RowData[]>([]);
  const [dateSplitApplied, setDateSplitApplied] = useState(false);
  const [customColumnValue, setCustomColumnValue] = useState<string>('');
  const [customColumnName, setCustomColumnName] = useState<string>('');
  const [uploadedFilesCount, setUploadedFilesCount] = useState<number>(() => {
    const savedResults = localStorage.getItem('analysisResults');
    return savedResults ? JSON.parse(savedResults).length : 0;
  });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>(() => {
    const savedNames = localStorage.getItem('uploadedFileNames');
    return savedNames ? JSON.parse(savedNames) : [];
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedResults = localStorage.getItem('analysisResults');
    if (savedResults) {
      setUploadedFilesCount(JSON.parse(savedResults).length);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('uploadedFileNames', JSON.stringify(uploadedFileNames));
  }, [uploadedFileNames]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      setUploadedFile(file);
      setUploadedFileNames(prev => [...prev, file.name]);

      const sheetsResponse = await api.post<string[]>('get-sheets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSheets(sheetsResponse.data);
      setSelectedSheet('');
    } catch (error) {
      console.error('Error getting sheets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error processing file';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    if (!uploadedFile) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('sheet', sheetName);

      const res = await api.post<RowData[]>('upload-sheet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      let data = res.data.map((row: RowData, idx: number) => ({ ...row, id: idx }));
      
      // Add custom column if values are set
      if (customColumnName && customColumnValue) {
        data = data.map(row => ({
          ...row,
          [customColumnName]: customColumnValue
        }));
      }

      setRows(data);
      setFilteredRows(data);
      onData(data);
      setSelectedSheet(sheetName);
      setDateSplitApplied(false);
      setDateColumn('');
    } catch (error) {
      console.error('Error loading sheet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error loading sheet';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateColumnSelect = (column: string) => {
    setDateColumn(column);
    if (rows.length > 0) {
      const updatedRows = rows.map(row => {
        // Get the date string and discard everything after space
        const dateStr = String(row[column]).split(' ')[0];
        let year, month, day;
        
        if (dateDelimiter && dateStr.includes(dateDelimiter)) {
          // Split by delimiter if it exists
          const parts = dateStr.split(dateDelimiter);
          if (parts.length >= 3) {
            // Find the year (4 digits)
            const yearIndex = parts.findIndex(part => part.length === 4);
            if (yearIndex !== -1) {
              year = parts[yearIndex];
              // Remove year from parts
              parts.splice(yearIndex, 1);
            }
            
            // Middle part is day, other is month
            if (parts.length >= 2) {
              day = parts[1]; // Middle part
              month = parts[0]; // First remaining part
            }
          }
        }
        
        // If we couldn't determine parts or no delimiter, use sequential
        if (!year || !month || !day) {
          year = dateStr.substring(0, 4);
          month = dateStr.substring(4, 6).padStart(2, '0');
          day = dateStr.substring(6, 8).padStart(2, '0');
        }

        return {
          ...row,
          [`${column}_year`]: year,
          [`${column}_month`]: month,
          [`${column}_day`]: day
        };
      });
      
      setRows(updatedRows);
      setFilteredRows(updatedRows);
      onData(updatedRows);
      setDateSplitApplied(true);
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
      
      setData(filteredRows);
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
        hide: !visibleColumns.includes(field),
      } as GridColDef));
  }, [rows, visibleColumns]);

  useEffect(() => {
    if (rows.length > 0) {
      // Initialize visible columns with all columns except 'id'
      const allColumns = Object.keys(rows[0]).filter(key => key !== 'id');
      setVisibleColumns(allColumns);
    }
  }, [rows]);

  const handleColumnVisibilityChange = (column: string, isVisible: boolean) => {
    setVisibleColumns(prev => {
      if (isVisible) {
        return [...prev, column];
      } else {
        return prev.filter(col => col !== column);
      }
    });
  };

  const rtlTheme = createTheme({
    direction: 'rtl',
  });

  const handleStartOver = async () => {
    try {
      await api.delete('/clear-data');
      localStorage.clear();
      setRows([]);
      setFilteredRows([]);
      setSheets([]);
      setSelectedSheet('');
      setUploadedFile(null);
      setDateColumn('');
      setDateSplitApplied(false);
      setCustomColumnName('');
      setCustomColumnValue('');
      setUploadedFilesCount(0);
      setUploadedFileNames([]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  return (
    <ThemeProvider theme={rtlTheme}>
      <Box p={4}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          textAlign: 'center',
          mb: 4
        }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 'bold',
              mb: 4,
              color : 'info.dark'
            }}
          >
            Upload & Preview
          </Typography>

          {uploadedFileNames.length > 0 && (
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                mb: 3, 
                width: '100%', 
                maxWidth: 600,
                backgroundColor: 'background.paper'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Uploaded Files
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {uploadedFileNames.map((fileName, index) => (
                  <Chip
                    key={index}
                    label={fileName}
                    onDelete={() => {
                      setUploadedFileNames(prev => prev.filter((_, i) => i !== index));
                    }}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            </Paper>
          )}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button 
              variant="outlined" 
              component="label" 
              sx={{ 
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                letterSpacing: '0.1em',
                boxShadow: 1,
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
              disabled={loading}
            >
              <Upload sx={{ mr: 1 }} />
              Upload File
              <input
                hidden
                type="file"
                accept=".xlsx,.csv"
                onChange={handleUpload}
                disabled={loading}
              />
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/analysis')}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                letterSpacing: '0.1em',
                boxShadow: 1,
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            >
              Go to Analysis
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setConfirmDialogOpen(true)}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                letterSpacing: '0.1em',
                boxShadow: 1,
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            >
              Start Over
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            You have uploaded {uploadedFilesCount > 0 ? `${uploadedFilesCount} files so far` : `No file yet`}
          </Typography>
        </Box>

        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
        >
          <DialogTitle>Start Over</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to start over? This will clear all uploaded data and analysis results.
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              handleStartOver();
              setConfirmDialogOpen(false);
            }} color="error" variant="contained">
              Start Over
            </Button>
          </DialogActions>
        </Dialog>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {sheets.length > 0 && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Sheet</InputLabel>
            <Select
              value={selectedSheet}
              label="Select Sheet"
              onChange={(e) => handleSheetSelect(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="" disabled>
                Select sheet please
              </MenuItem>
              {sheets.map((sheet) => (
                <MenuItem key={sheet} value={sheet}>
                  {sheet}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

          {!loading && rows.length > 0 && (
            <>
              <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="h6" sx={{ minWidth: 200 }}>Add Custom Column</Typography>
                <FormControl fullWidth sx={{ width : 200 }}>
                  <InputLabel>Select Column Name</InputLabel>
                  <Select
                    value={customColumnName}
                    label="Column Name"
                    onChange={(e) => setCustomColumnName(e.target.value)}
                  >
                    <MenuItem value="">
                      Select Column Name
                    </MenuItem>
                    {['پخش'].map((col_name) => (
                      <MenuItem key={col_name} value={col_name}>
                        {col_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ width : 200 }}>
                  <InputLabel>Select Column Value</InputLabel>
                  <Select
                    value={customColumnValue}
                    label="Column Value"
                    onChange={(e) => setCustomColumnValue(e.target.value)}
                  >
                    <MenuItem value="">
                      Select Column Value
                    </MenuItem>
                    {['بهستان','البرز','داروپخش','هجرت'].map((col_val) => (
                      <MenuItem key={col_val} value={col_val}>
                        {col_val}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="text"
                  sx={{ minWidth : 100 }}
                  onClick={() => {
                    if (!customColumnName || !customColumnValue) return;
                    
                    const updatedRows = rows.map(row => ({
                      ...row,
                      [customColumnName]: customColumnValue
                    }));
                    
                    setRows(updatedRows);
                    setFilteredRows(updatedRows);
                    onData(updatedRows);
                    
                    // Clear the input fields
                    setCustomColumnName('');
                    setCustomColumnValue('');
                  }}
                  disabled={!customColumnName || !customColumnValue}
                >
                  Add Column
                </Button>
              </Box>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center', textAlign: 'left' }}>
              <Typography variant="h6" sx={{ minWidth: 200 }}>Select Date Column</Typography>
              <FormControl sx={{ width : 200 }}>
                <InputLabel>Date Column</InputLabel>
                <Select
                  value={dateColumn}
                  label="Date Column"
                  onChange={(e) => handleDateColumnSelect(e.target.value)}
                  disabled={dateSplitApplied}
                >
                  {Object.keys(rows[0])
                    .filter(key => key !== 'id')
                    .map((column) => (
                      <MenuItem key={column} value={column}>
                        {column}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <TextField
                label="Date Delimiter"
                value={dateDelimiter}
                onChange={(e) => setDateDelimiter(e.target.value)}
                disabled={dateSplitApplied}
                placeholder="e.g. - or /"
                sx={{ width: 150 }}
                helperText="Leave empty for sequential dates"
              />
              {dateSplitApplied && (
                <Button
                  variant="text"
                  color="error"
                  onClick={() => {
                    // Remove the split date columns
                    const updatedRows = rows.map(row => {
                      const newRow = { ...row };
                      delete newRow[`${dateColumn}_year`];
                      delete newRow[`${dateColumn}_month`];
                      delete newRow[`${dateColumn}_day`];
                      return newRow;
                    });
                    
                    setRows(updatedRows);
                    setFilteredRows(updatedRows);
                    onData(updatedRows);
                    setDateSplitApplied(false);
                    setDateColumn('');
                    setDateDelimiter('');
                  }}
                >
                  Revert Date Split
                </Button>
              )}
            </Box>
          
            </Paper>
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
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={() => setColumnDialogOpen(true)}
                  startIcon={<Visibility />}
                  sx={{
                    backgroundColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    }
                  }}
                >
                  Manage Columns
                </Button>
              </Box>
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

            <Dialog
              open={columnDialogOpen}
              onClose={() => setColumnDialogOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Manage Columns</DialogTitle>
              <DialogContent>
                <List>
                  {Object.keys(rows[0] || {})
                    .filter(key => key !== 'id')
                    .map((column) => (
                      <ListItem key={column}>
                        <ListItemButton onClick={() => handleColumnVisibilityChange(column, !visibleColumns.includes(column))}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={visibleColumns.includes(column)}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText primary={column} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                </List>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setColumnDialogOpen(false)}>Close</Button>
                <Button
                  onClick={() => {
                    const allColumns = Object.keys(rows[0]).filter(key => key !== 'id');
                    setVisibleColumns(allColumns);
                  }}
                >
                  Show All
                </Button>
                <Button
                  onClick={() => {
                    setVisibleColumns([]);
                  }}
                >
                  Hide All
                </Button>
              </DialogActions>
            </Dialog>
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