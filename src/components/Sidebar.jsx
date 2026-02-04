import { useState } from 'react'
import { 
  FaHome, 
  FaMap,
  FaCog,
  FaLayerGroup,
  FaDesktop,
  FaBell,
  FaUser
} from 'react-icons/fa'
import { MdLanguage } from 'react-icons/md'
import mitsubishiLogo from '../assets/Mitsubishi_Electric-Logo_Full.png'
import mitsubishiLogoCollapsed from '../assets/mitsubishi logo.png'
import './Sidebar.css'

const Sidebar = ({ activePage, setActivePage, collapsed, setCollapsed }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: FaHome, hasNotification: true },
    { id: 'maps', label: 'Live Trends', icon: FaMap },
    { id: 'missions', label: 'Alarms', icon: FaCog },
    { id: 'actions', label: 'Maintenance', icon: FaLayerGroup },
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
              <Icon className="nav-icon" />
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
