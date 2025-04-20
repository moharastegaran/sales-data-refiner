import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import GroupedGrid from './Components/GroupedGrid';
import ExcelUploader from './Components/ExcelUploader';

function App() {
  const [data, setData] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<string>('');
  const [aggCol, setAggCol] = useState<string>('');
  const [operator, setOperator] = useState<string>('>');
  const [threshold, setThreshold] = useState<number>(0);

  // TODO: Add UI controls for user to select groupBy, aggCol, operator, threshold

  return (
    <div>
      <ExcelUploader onData={setData} />
      {groupBy && (
        <GroupedGrid
          groupBy={groupBy}
          aggCol={aggCol}
          operator={operator}
          threshold={threshold}
        />
      )}
    </div>
  );
}

export default App;
