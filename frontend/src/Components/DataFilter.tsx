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
  Chip,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export interface FilterCondition {
  column: string;
  operator: string;
  value: string | string[];
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
  { value: 'in', label: 'In List' },
];

const DataFilter: FC<DataFilterProps> = ({ columns, onFilterChange }) => {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { column: '', operator: 'equals', value: '' },
  ]);
  const [inputValues, setInputValues] = useState<{ [key: number]: string }>({});
  const [columnValues, setColumnValues] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    // Initialize column values
    const initialValues: { [key: string]: string[] } = {};
    columns.forEach(column => {
      initialValues[column] = [];
    });
    setColumnValues(initialValues);
  }, [columns]);

  const handleAddCondition = () => {
    setConditions([...conditions, { column: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
    onFilterChange(newConditions);
  };

  const handleConditionChange = (index: number, field: keyof FilterCondition, value: string | string[]) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
    onFilterChange(newConditions);
  };

  const handleReset = () => {
    setConditions([{ column: '', operator: 'equals', value: '' }]);
    onFilterChange([]);
  };

  const handleInputChange = (index: number, value: string) => {
    setInputValues(prev => ({ ...prev, [index]: value }));
    
    const condition = conditions[index];
    if (condition.operator === 'in') {
      const values = value.split(',').map(v => v.trim()).filter(v => v !== '');
      handleConditionChange(index, 'value', values);
    } else {
      handleConditionChange(index, 'value', value);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Filter Conditions</Typography>
        <Button
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          variant="outlined"
          color="secondary"
          disabled={conditions.length === 1 && !conditions[0].column}
        >
          Reset Filters
        </Button>
      </Box>
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

          {condition.operator === 'in' ? (
            <FormControl sx={{ flex: 1 }}>
              <TextField
                label="Values (comma-separated)"
                value={inputValues[index] || ''}
                onChange={(e) => handleInputChange(index, e.target.value)}
                helperText="Enter multiple values separated by commas"
                fullWidth
              />
              {Array.isArray(condition.value) && condition.value.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {condition.value.map((value, i) => (
                    <Chip
                      key={i}
                      label={value}
                      onDelete={() => {
                        if (Array.isArray(condition.value)) {
                          const newValues = condition.value.filter((_, idx) => idx !== i);
                          handleConditionChange(index, 'value', newValues);
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            </FormControl>
          ) : (
            <TextField
              label="Value"
              value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
              onChange={(e) => handleInputChange(index, e.target.value)}
              sx={{ flex: 1 }}
            />
          )}

          <IconButton
            onClick={() => handleRemoveCondition(index)}
            disabled={conditions.length === 1}
            color="error"
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