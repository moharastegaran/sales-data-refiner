import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import ExcelUploader from './Components/ExcelUploader';
import DataAnalysis from './Components/DataAnalysis';

function App() {
  return (
    <Router>
      <DataProvider>
        <Routes>
          <Route path="/" element={<ExcelUploader onData={() => {}} />} />
          <Route path="/analysis" element={<DataAnalysis />} />
        </Routes>
      </DataProvider>
    </Router>
  );
}

export default App;
