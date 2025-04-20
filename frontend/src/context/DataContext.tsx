import React, { createContext, useContext, useState } from 'react';
import { RowData } from '../types/DataTypes';

// Create a simple context type
type DataContextType = {
  data: RowData[];
  setData: (data: RowData[]) => void;
};

// Create the context with a default value
const DataContext = createContext<DataContextType>({
  data: [],
  setData: () => {},
});

// Create a simple hook to use the context
export const useData = () => useContext(DataContext);

// Create a simple provider component
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<RowData[]>([]);

  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  );
}; 