import React, { FC, useState, useMemo } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import api from '../api';

interface RowData {
  id: number;
  [key: string]: any;
}

interface ExcelUploaderProps {
  onData: (data: RowData[]) => void;
}

const ExcelUploader: FC<ExcelUploaderProps> = ({ onData }) => {
  const [rows, setRows] = useState<RowData[]>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post<RowData[]>('upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    const data = res.data.map((row: RowData, idx: number) => ({ ...row, id: idx }));
    setRows(data);
    onData(data);
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
      <Button variant="contained" component="label" sx={{ mt: 2 }}>
        Upload File
        <input
          hidden
          type="file"
          accept=".xlsx,.csv"
          onChange={handleUpload}
        />
      </Button>

      {rows.length > 0 && (
        <Box sx={{ height: 500, mt: 3 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            slots={{ toolbar: GridToolbar }}
            pageSizeOptions={[10, 25, 50]}
            filterMode="client"
          />
        </Box>
      )}
    </Box>
  );
};

export default ExcelUploader;