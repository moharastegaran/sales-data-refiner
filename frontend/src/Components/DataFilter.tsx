import React, { FC, useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export interface FilterCondition {
  column: string;
  operator: string;
  value: string;
}

interface DataFilterProps {
  columns: string[];
  onFilterChange: (conditions: FilterCondition[]) => void;
}

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater Than or Equal' },
  { value: '<=', label: 'Less Than or Equal' },
];

const DataFilter: FC<DataFilterProps> = ({ columns, onFilterChange }) => {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { column: '', operator: 'equals', value: '' },
  ]);

  const handleAddCondition = () => {
    setConditions([...conditions, { column: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
    onFilterChange(newConditions);
  };

  const handleConditionChange = (index: number, field: keyof FilterCondition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
    onFilterChange(newConditions);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Filter Conditions
      </Typography>
      {conditions.map((condition, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Column</InputLabel>
            <Select
              value={condition.column}
              label="Column"
              onChange={(e) => handleConditionChange(index, 'column', e.target.value)}
            >
              {columns.map((col) => (
                <MenuItem key={col} value={col}>
                  {col}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={condition.operator}
              label="Operator"
              onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
            >
              {operators.map((op) => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Value"
            value={condition.value}
            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
            sx={{ flex: 1 }}
          />

          <IconButton
            onClick={() => handleRemoveCondition(index)}
            color="error"
            disabled={conditions.length === 1}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={handleAddCondition}
        variant="outlined"
        sx={{ mt: 1 }}
      >
        Add Condition
      </Button>
    </Paper>
  );
};

export default DataFilter; 