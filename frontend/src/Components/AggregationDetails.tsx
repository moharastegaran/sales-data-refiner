import React, { FC } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';

interface AggregationDetailsProps {
  data: Array<{
    [key: string]: any;
    aggregate_value: number;
    count: number;
  }>;
  groupBy: string[];
  aggregateColumn: string;
}

const AggregationDetails: FC<AggregationDetailsProps> = ({ data, groupBy, aggregateColumn }) => {
  // Group the data by the first groupBy column
  const groupedData = data.reduce((acc, item) => {
    const mainGroup = item[groupBy[0]];
    if (!acc[mainGroup]) {
      acc[mainGroup] = [];
    }
    acc[mainGroup].push(item);
    return acc;
  }, {} as Record<string, typeof data>);

  return (
    <Box sx={{ mt: 3 }}>
      {Object.entries(groupedData).map(([mainGroup, items]) => (
        <Paper key={mainGroup} sx={{ mb: 2, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {mainGroup}
          </Typography>
          <List>
            {items.map((item, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={
                      groupBy.length > 1 
                        ? `${item[groupBy[1]]}`
                        : `${aggregateColumn}: ${item.aggregate_value}`
                    }
                    secondary={`Count: ${item.count}`}
                  />
                </ListItem>
                {index < items.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ))}
    </Box>
  );
};

export default AggregationDetails; 