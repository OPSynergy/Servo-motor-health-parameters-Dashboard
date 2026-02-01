import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import './HistoricalCharts.css';

function HistoricalCharts({ data, historicalData, timeRange }) {
  // Format aggregated data for charts
  const chartData = data.map(item => ({
    time: format(parseISO(item._id), 'HH:mm'),
    date: format(parseISO(item._id), 'MMM dd'),
    temperature: item.avgTemperature?.toFixed(2),
    vibration: item.avgVibration?.toFixed(2),
    current: item.avgCurrent?.toFixed(2),
    rpm: item.avgRpm?.toFixed(0),
    healthScore: item.avgHealthScore?.toFixed(2)
  }));

  // Format recent historical data for real-time chart
  const recentData = historicalData.slice(-20).map(item => ({
    time: format(new Date(item.timestamp), 'HH:mm:ss'),
    temperature: item.temperature,
    vibration: item.vibration,
    current: item.current,
    rpm: item.rpm,
    healthScore: item.healthScore
  }));

  const formatTimeLabel = (timeStr) => {
    if (timeRange === '7d') {
      return timeStr.split(',')[0]; // Show date for 7d range
    }
    return timeStr;
  };

  return (
    <div className="historical-charts">
      <h3>Historical Trends</h3>
      
      {chartData.length === 0 ? (
        <div className="no-chart-data">
          <p>No historical data available for the selected time range</p>
          <p className="hint">Data will appear once the MQTT publisher sends sensor readings</p>
        </div>
      ) : (
        <div className="charts-grid">
          <div className="chart-container">
            <h4>Temperature & Vibration</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={timeRange === '7d' ? 'date' : 'time'}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f44336"
                  fill="#f44336"
                  fillOpacity={0.3}
                  name="Temperature (°C)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="vibration"
                  stroke="#ff9800"
                  fill="#ff9800"
                  fillOpacity={0.3}
                  name="Vibration (g)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4>Current & RPM</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={timeRange === '7d' ? 'date' : 'time'}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="current"
                  stroke="#2196f3"
                  strokeWidth={2}
                  name="Current (A)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rpm"
                  stroke="#9c27b0"
                  strokeWidth={2}
                  name="RPM"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4>Health Score Trend</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={timeRange === '7d' ? 'date' : 'time'}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="healthScore"
                  stroke="#4caf50"
                  fill="#4caf50"
                  fillOpacity={0.3}
                  name="Health Score (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {recentData.length > 0 && (
            <div className="chart-container">
              <h4>Real-time Data (Last 20 readings)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={recentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f44336"
                    strokeWidth={2}
                    dot={false}
                    name="Temp (°C)"
                  />
                  <Line
                    type="monotone"
                    dataKey="vibration"
                    stroke="#ff9800"
                    strokeWidth={2}
                    dot={false}
                    name="Vibration (g)"
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#2196f3"
                    strokeWidth={2}
                    dot={false}
                    name="Current (A)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rpm"
                    stroke="#9c27b0"
                    strokeWidth={2}
                    dot={false}
                    name="RPM"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HistoricalCharts;
