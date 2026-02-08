import { useState } from 'react'
import { 
  Home,
  Activity,
  TrendingUp,
  Bell,
  Settings,
  Wrench,
  ChevronDown,
  Cog,
  Monitor,
  FileText,
  Heart
} from 'lucide-react'
import mitsubishiLogo from '../assets/mitsubishi-electric-changes-for-the-better-logo-png_seeklogo-93542-removebg-preview.png'
import mitsubishiLogoCollapsed from '../assets/mitsubishi logo.png'
import './Sidebar.css'

const Sidebar = ({ activePage, setActivePage, collapsed, setCollapsed }) => {
  const [monitoringOpen, setMonitoringOpen] = useState(false)
  const [liveTrendsOpen, setLiveTrendsOpen] = useState(false)

  const menuItems = [
    { 
      id: 'home', 
      label: 'Home', 
      icon: Home, 
      hasNotification: true 
    },
    { 
      id: 'motor-setup', 
      label: 'Motor Setup', 
      icon: Cog 
    },
    { 
      id: 'monitoring', 
      label: 'Monitoring', 
      icon: Monitor,
      hasDropdown: true,
      subItems: [
        { 
          id: 'live-trends', 
          label: 'Live Trends',
          hasSubDropdown: true,
          subSubItems: [
            { id: 'vibration', label: 'Vibration' },
            { id: 'temperature', label: 'Temperature' },
            { id: 'current-consumption', label: 'Current Consumption' },
            { id: 'belt-tension', label: 'Belt Tension' }
          ]
        },
        { id: 'data-logs', label: 'Data Logs' }
      ]
    },
    { 
      id: 'motor-health', 
      label: 'Motor Health', 
      icon: Activity 
    },
    { 
      id: 'missions', 
      label: 'Alarms', 
      icon: Bell 
    },
    { 
      id: 'actions', 
      label: 'Maintenance', 
      icon: Wrench 
    },
    { 
      id: 'health-indexing', 
      label: 'Health Indexing', 
      icon: Heart 
    }
  ]

  const handleParentClick = (item) => {
    if (item.hasDropdown) {
      if (item.id === 'monitoring') {
        setMonitoringOpen(!monitoringOpen)
      }
      if (collapsed) {
        setCollapsed(false)
      }
    } else {
      setActivePage(item.id)
    }
  }

  const handleSubItemClick = (subItem) => {
    if (subItem.hasSubDropdown) {
      setLiveTrendsOpen(!liveTrendsOpen)
    } else {
      setActivePage(subItem.id)
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
          const isParentActive = item.hasDropdown && 
            item.subItems?.some(sub => 
              activePage === sub.id || 
              (sub.hasSubDropdown && sub.subSubItems?.some(subSub => activePage === subSub.id))
            )
          
          return (
            <div key={item.id}>
              {/* Main menu item */}
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
                    className={`dropdown-chevron ${monitoringOpen ? 'rotated' : ''}`}
                    size={18}
                    strokeWidth={2}
                  />
                )}
              </button>
              
              {/* First level dropdown (Monitoring) */}
              {item.hasDropdown && !collapsed && monitoringOpen && (
                <div className="dropdown-menu">
                  {item.subItems.map((subItem) => {
                    const isSubActive = activePage === subItem.id || 
                      (subItem.hasSubDropdown && subItem.subSubItems?.some(subSub => activePage === subSub.id))
                    
                    return (
                      <div key={subItem.id}>
                        <button
                          className={`dropdown-item ${isSubActive ? 'active' : ''}`}
                          onClick={() => handleSubItemClick(subItem)}
                        >
                          <span className="dropdown-dot"></span>
                          <span className="dropdown-label">{subItem.label}</span>
                          {subItem.hasSubDropdown && (
                            <ChevronDown 
                              className={`dropdown-chevron-sub ${liveTrendsOpen ? 'rotated' : ''}`}
                              size={16}
                              strokeWidth={2}
                            />
                          )}
                        </button>
                        
                        {/* Second level dropdown (Live Trends) */}
                        {subItem.hasSubDropdown && liveTrendsOpen && (
                          <div className="dropdown-menu-sub">
                            {subItem.subSubItems.map((subSubItem) => (
                              <button
                                key={subSubItem.id}
                                className={`dropdown-item-sub ${activePage === subSubItem.id ? 'active' : ''}`}
                                onClick={() => setActivePage(subSubItem.id)}
                              >
                                <span className="dropdown-dot-sub"></span>
                                <span className="dropdown-label">{subSubItem.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
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