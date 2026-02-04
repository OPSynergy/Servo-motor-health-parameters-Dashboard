import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import MotorHealth from './pages/MotorHealth'
import Alarms from './pages/Alarms'
import Maintenance from './pages/Maintenance'
import LiveDataTrends from './pages/LiveDataTrends'
import Settings from './pages/Settings'
import './App.css'

function App() {
  const [activePage, setActivePage] = useState('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Home />
      case 'maps':
        return <Home />
      case 'missions':
        return <Home />
      case 'actions':
        return <Home />
      case 'simple-screen':
        return <Home />
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
    <div className="app-container">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderPage()}
      </main>
    </div>
  )
}

export default App
