import React, { FC, useState } from 'react';
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface DataGrouperProps {
  columns: string[];
  onGroupChange: (groupBy: string[]) => void;
}

const DataGrouper: FC<DataGrouperProps> = ({ columns, onGroupChange }) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const handleAddGroup = () => {
    if (selectedColumns.length < columns.length) {
      const availableColumns = columns.filter(col => !selectedColumns.includes(col));
      if (availableColumns.length > 0) {
        const newColumns = [...selectedColumns, availableColumns[0]];
        setSelectedColumns(newColumns);
        onGroupChange(newColumns);
      }
    }
  };

  const handleRemoveGroup = (column: string) => {
    const newColumns = selectedColumns.filter(col => col !== column);
    setSelectedColumns(newColumns);
    onGroupChange(newColumns);
  };

  const handleColumnChange = (oldColumn: string, newColumn: string) => {
    const newColumns = selectedColumns.map(col => 
      col === oldColumn ? newColumn : col
    );
    setSelectedColumns(newColumns);
    onGroupChange(newColumns);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Group By</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddGroup}
          variant="outlined"
          disabled={selectedColumns.length >= columns.length}
        >
          Add Group
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {selectedColumns.map((column, index) => (
          <Chip
            key={column}
            label={
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={column}
                  onChange={(e) => handleColumnChange(column, e.target.value)}
                  sx={{ 
                    '& .MuiSelect-select': { 
                      py: 0.5,
                      fontSize: '0.875rem',
                    }
                  }}
                >
                  {columns
                    .filter(col => !selectedColumns.includes(col) || col === column)
                    .map(col => (
                      <MenuItem key={col} value={col}>
                        {col}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            }
            onDelete={() => handleRemoveGroup(column)}
            sx={{ 
              '& .MuiChip-deleteIcon': {
                marginLeft: 'auto',
              }
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};

export default DataGrouper; 