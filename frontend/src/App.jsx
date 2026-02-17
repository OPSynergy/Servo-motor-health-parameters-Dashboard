import { useState } from 'react'
import Sidebar from './components/Sidebar'
import LiveStatusIndicator from './components/LiveStatusIndicator'
import Home from './pages/Home'
import MotorHealth from './pages/MotorHealth'
import Alarms from './pages/Alarms'
import Maintenance from './pages/Maintenance'
import LiveDataTrends from './pages/LiveDataTrends'
import Settings from './pages/Settings'
import LiveTrendsGraph from './components/LiveTrendsGraph'
import Hero3D from './Hero3D'
import './App.css'
import MotorSetup from './pages/MotorSetup'
import DataLogs from './pages/DataLogs'
import HealthIndexing from './pages/HealthIndexing'
import PredictiveData from './pages/PredictiveData'
import NewAlarmsPopup from './components/NewAlarmsPopup'

function App() {
  const [activePage, setActivePage] = useState('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const renderPage = () => {
    switch (activePage) { 
      case 'home':
        return <Home />
      case 'maps':
        return <LiveDataTrends />
      case 'vibration':
        return <LiveTrendsGraph type="vibration" />
      case 'temperature':
        return <LiveTrendsGraph type="temperature" />
      case 'power-consumption':
        return <LiveTrendsGraph type="power-consumption" />
      case 'belt-tension':
        return <LiveTrendsGraph type="belt-tension" />
      case 'speed':
        return <LiveTrendsGraph type="speed" />
      case 'torque':
        return <LiveTrendsGraph type="torque" />
      case 'data-logs':
        return <DataLogs />
      case 'missions':
        return <Alarms />
      case 'actions':
        return <Maintenance />
      case 'motor-health':
        return <MotorHealth />
      case 'alarms':
        return <Alarms />
      case 'maintenance':
        return <Maintenance />
      case 'live-data':
        return <LiveDataTrends />
      case 'settings':
        return <Settings />
      case 'motor-setup':
        return <MotorSetup />
      case 'health-indexing':
        return <HealthIndexing />
      case 'predictive-data':
        return <PredictiveData />
      default:
        return <Home />
    }
  }

  return (
    <div className="app-wrapper">
      {/* Layer 1: 3D Background (z-index: 1) */}
      <Hero3D />

      {/* Layer 2: Sidebar (z-index: 1000 from Sidebar.css) */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Live Status Indicator - Top Right */}
      <LiveStatusIndicator />

      {/* Global popup when new alarms are detected (e.g. after seed script) */}
      <NewAlarmsPopup />

      {/* Layer 3: Content (z-index: 100) */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderPage()}
      </main>
    </div>
  )
}

export default App