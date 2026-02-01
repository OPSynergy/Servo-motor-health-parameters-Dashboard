import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { getDevices, getLatestData, getUnresolvedAlerts } from '../services/api';
import DeviceList from './DeviceList';
import DeviceDetail from './DeviceDetail';
import AlertsPanel from './AlertsPanel';
import './Dashboard.css';

function Dashboard() {
  const { socket, connected } = useSocket();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [latestData, setLatestData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (socket && connected) {
      socket.on('sensor-data', (data) => {
        setLatestData(prev => ({
          ...prev,
          [data.deviceId]: data
        }));
      });

      socket.on('alert', (alert) => {
        setAlerts(prev => [alert, ...prev.filter(a => 
          !(a.deviceId === alert.deviceId && a.type === alert.type && a.severity === alert.severity)
        )]);
        loadAlerts();
      });

      return () => {
        socket.off('sensor-data');
        socket.off('alert');
      };
    }
  }, [socket, connected]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const deviceList = await getDevices();
      setDevices(deviceList);
      
      if (deviceList.length > 0 && !selectedDevice) {
        setSelectedDevice(deviceList[0]);
      }

      // Load latest data for all devices
      const dataPromises = deviceList.map(deviceId => 
        getLatestData(deviceId).catch(() => null)
      );
      const dataResults = await Promise.all(dataPromises);
      const dataMap = {};
      deviceList.forEach((deviceId, index) => {
        if (dataResults[index]) {
          dataMap[deviceId] = dataResults[index];
        }
      });
      setLatestData(dataMap);

      await loadAlerts();
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const unresolved = await getUnresolvedAlerts();
      setAlerts(unresolved);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const handleDeviceSelect = (deviceId) => {
    setSelectedDevice(deviceId);
    if (socket && connected) {
      socket.emit('subscribe-device', deviceId);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-status">
        <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-sidebar">
          <DeviceList
            devices={devices}
            selectedDevice={selectedDevice}
            latestData={latestData}
            onSelect={handleDeviceSelect}
          />
          <AlertsPanel alerts={alerts} />
        </div>
        
        <div className="dashboard-main">
          {selectedDevice ? (
            <DeviceDetail
              deviceId={selectedDevice}
              latestData={latestData[selectedDevice]}
              socket={socket}
              connected={connected}
            />
          ) : (
            <div className="no-device-selected">
              <p>Select a device to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
