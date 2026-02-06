import { useState } from 'react'
import { 
  Home,
  Activity,
  TrendingUp,
  Bell,
  Settings,
  Wrench
} from 'lucide-react'
import mitsubishiLogo from '../assets/mitsubishi-electric-changes-for-the-better-logo-png_seeklogo-93542-removebg-preview.png'
import mitsubishiLogoCollapsed from '../assets/mitsubishi logo.png'
import './Sidebar.css'

const Sidebar = ({ activePage, setActivePage, collapsed, setCollapsed }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, hasNotification: true },
    { id: 'motor-health', label: 'Motor Health', icon: Activity },
    { id: 'maps', label: 'Live Trends', icon: TrendingUp },
    { id: 'missions', label: 'Alarms', icon: Bell },
    { id: 'actions', label: 'Maintenance', icon: Wrench },
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div 
          className="logo-container"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={collapsed ? mitsubishiLogoCollapsed : mitsubishiLogo} 
            alt="Mitsubishi Electric Logo" 
            className="logo-image"
          />
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : ''}
            >
              <Icon className="nav-icon" size={22} strokeWidth={2} />
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {item.hasNotification && !collapsed && (
                <span className="notification-dot"></span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar