import React, { FC, useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import api from '../api';

interface Group {
  id: number;
  group_value: string;
  count: number;
  [key: string]: any;
}

interface GroupedGridProps {
  groupBy: string;
  aggCol?: string;
  operator?: string;
  threshold?: number;
}

const GroupedGrid: FC<GroupedGridProps> = ({ groupBy, aggCol, operator = '>', threshold = 0 }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<Group[]>('groups', { 
          params: { group_by: groupBy, agg_col: aggCol, operator, threshold } 
        });
        setGroups(res.data.map((group: Group, idx: number) => ({ ...group, id: idx })));
      } catch (err) {
        setError('Failed to fetch grouped data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [groupBy, aggCol, operator, threshold]);

  const columns: GridColDef[] = useMemo(() => [
    { field: 'group_value', headerName: groupBy, flex: 1 } as GridColDef,
    { field: 'count', headerName: 'Count', type: 'number' as const, width: 100 } as GridColDef,
    ...(aggCol
      ? [{ field: `sum_${aggCol}`, headerName: `Sum of ${aggCol}`, flex: 1, type: 'number' as const } as GridColDef]
      : []),
  ], [groupBy, aggCol]);

  const exportExcel = async () => {
    try {
      setLoading(true);
      const resp = await api.get<Blob>('export-groups', {
        params: { group_by: groupBy, agg_col: aggCol, operator, threshold },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'grouped_data.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h6" gutterBottom>
        {`Grouped by ${groupBy}${aggCol ? `, sum(${aggCol}) ${operator} ${threshold}` : ''}`}
      </Typography>
      <Box sx={{ height: 400, position: 'relative' }}>
        {loading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          }}>
            <CircularProgress />
          </Box>
        )}
        <DataGrid 
          rows={groups} 
          columns={columns} 
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          loading={loading}
        />
      </Box>
      <Button 
        variant="outlined" 
        sx={{ mt: 2 }} 
        onClick={exportExcel}
        disabled={loading}
      >
        Export to Excel
      </Button>
    </Box>
  );
};

export default GroupedGrid;