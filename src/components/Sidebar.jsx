import { useState } from 'react'
import { 
  Home,
  Activity,
  TrendingUp,
  Bell,
  Settings,
  Wrench,
  ChevronDown
} from 'lucide-react'
import mitsubishiLogo from '../assets/mitsubishi-electric-changes-for-the-better-logo-png_seeklogo-93542-removebg-preview.png'
import mitsubishiLogoCollapsed from '../assets/mitsubishi logo.png'
import './Sidebar.css'

const Sidebar = ({ activePage, setActivePage, collapsed, setCollapsed }) => {
  const [liveTrendsOpen, setLiveTrendsOpen] = useState(false)

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, hasNotification: true },
    { 
      id: 'maps', 
      label: 'Live Trends', 
      icon: TrendingUp,
      hasDropdown: true,
      subItems: [
        { id: 'vibration', label: 'Vibration' },
        { id: 'temperature', label: 'Temperature' },
        { id: 'current-consumption', label: 'Current Consumption' },
        { id: 'belt-tension', label: 'Belt Tension' }
      ]
    },
    { id: 'motor-health', label: 'Motor Health', icon: Activity },
    { id: 'missions', label: 'Alarms', icon: Bell },
    { id: 'actions', label: 'Maintenance', icon: Wrench },
  ]

  const handleParentClick = (item) => {
    if (item.hasDropdown) {
      setLiveTrendsOpen(!liveTrendsOpen)
      if (collapsed) {
        setCollapsed(false)
      }
    } else {
      setActivePage(item.id)
    }
  }

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
          const isParentActive = item.hasDropdown && item.subItems?.some(sub => activePage === sub.id)
          
          return (
            <div key={item.id}>
              <button
                className={`nav-item ${activePage === item.id || isParentActive ? 'active' : ''}`}
                onClick={() => handleParentClick(item)}
                title={collapsed ? item.label : ''}
              >
                <Icon className="nav-icon" size={22} strokeWidth={2} />
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {item.hasNotification && !collapsed && (
                  <span className="notification-dot"></span>
                )}
                {item.hasDropdown && !collapsed && (
                  <ChevronDown 
                    className={`dropdown-chevron ${liveTrendsOpen ? 'rotated' : ''}`}
                    size={18}
                    strokeWidth={2}
                  />
                )}
              </button>
              
              {item.hasDropdown && !collapsed && liveTrendsOpen && (
                <div className="dropdown-menu">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      className={`dropdown-item ${activePage === subItem.id ? 'active' : ''}`}
                      onClick={() => setActivePage(subItem.id)}
                    >
                      <span className="dropdown-dot"></span>
                      <span className="dropdown-label">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar