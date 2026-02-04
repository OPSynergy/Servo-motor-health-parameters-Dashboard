import { useState } from 'react'
import { 
  FaHome, 
  FaMap,
  FaCog,
  FaLayerGroup,
  FaDesktop,
  FaBell,
  FaChevronLeft,
  FaUser
} from 'react-icons/fa'
import { MdLanguage } from 'react-icons/md'
import './Sidebar.css'

const Sidebar = ({ activePage, setActivePage, collapsed, setCollapsed }) => {
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: FaHome, hasNotification: true },
    { id: 'maps', label: 'Maps', icon: FaMap },
    { id: 'missions', label: 'Missions', icon: FaCog },
    { id: 'actions', label: 'Actions', icon: FaLayerGroup },
    { id: 'simple-screen', label: 'Simple Screen', icon: FaDesktop },
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">R</div>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-peer">Peer</span>
              <span className="logo-robotics">Robotics</span>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="company-card">
          <div className="company-card-content">
            <div className="company-name">Peer Robotics</div>
            <div className="company-location">Detroit, MI</div>
          </div>
          <button 
            className="company-card-toggle"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
          >
            <FaChevronLeft />
          </button>
        </div>
      )}

      {collapsed && (
        <button 
          className="expand-sidebar-btn"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
        >
          <FaChevronLeft className="rotate-180" />
        </button>
      )}

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

      <div className="sidebar-footer">
        <button className="footer-icon-btn" title="Avatar">
          <FaUser className="footer-icon" />
        </button>
        <button className="footer-icon-btn" title="Language">
          <MdLanguage className="footer-icon" />
        </button>
        <button className="footer-icon-btn" title="Notifications">
          <FaBell className="footer-icon" />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
