import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { SocketProvider } from './context/SocketContext';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <div className="App">
        <header className="app-header">
          <h1>🔧 Servo Motor Health Dashboard</h1>
          <p>Real-time Predictive Maintenance Monitoring</p>
        </header>
        <Dashboard />
      </div>
    </SocketProvider>
  );
}

export default App;
