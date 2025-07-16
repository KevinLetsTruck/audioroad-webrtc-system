import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import HomePage from './pages/HomePage';
import ScreenerDashboard from './pages/ScreenerDashboard';
import HostDashboard from './pages/HostDashboard';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/screener" element={<ScreenerDashboard />} />
            <Route path="/host" element={<HostDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
