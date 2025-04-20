import React, { FC, useState, useMemo } from 'react';
import { Box, Button, Typography, CircularProgress, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
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
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredRows, setFilteredRows] = useState<RowData[]>([]);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);

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
    } finally {
      setLoading(false);
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

  return (
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
          </Box>
          <Box sx={{ height: 500, mt: 2 }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50]}
              filterMode="client"
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default ExcelUploader;