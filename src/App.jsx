import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import MotorHealth from './pages/MotorHealth'
import Alarms from './pages/Alarms'
import Maintenance from './pages/Maintenance'
import LiveDataTrends from './pages/LiveDataTrends'
import Settings from './pages/Settings'
import Hero3D from './Hero3D'
import './App.css'

function App() {
  const [activePage, setActivePage] = useState('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Home />
      case 'maps':
        return <LiveDataTrends />
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

      {/* Layer 3: Content (z-index: 100) */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderPage()}
      </main>
    </div>
  )
}

export default App