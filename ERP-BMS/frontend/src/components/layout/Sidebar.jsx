import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Receipt,
  DollarSign,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString())
  }, [isCollapsed])

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/items', icon: Package, label: 'Items' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/invoices', icon: FileText, label: 'Invoices' },
    { path: '/receipts', icon: Receipt, label: 'Sales Receipts' },
    { path: '/expenses', icon: DollarSign, label: 'Expenses', roles: ['admin', 'accountant'] },
    { path: '/reports', icon: BarChart3, label: 'Analytics & Reports', roles: ['admin', 'accountant'] },
  ].filter(item => !item.roles || item.roles.includes(user?.role))

  const adminItems = [
    { path: '/users', icon: UserCog, label: 'Users' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  const isAdmin = user?.role === 'admin'

  return (
    <div
      className={`fixed lg:static inset-y-0 left-0 z-50 bg-card border-r border-border/60 flex flex-col transition-all duration-300 shadow-2xl lg:shadow-none 
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} 
        ${isOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-border/60 relative">
        <div className="flex items-center justify-between lg:block">
          {!isCollapsed || isOpen ? (
            <div className="flex items-center gap-3">
              <img
                src="/image.png"
                alt="Ilays Logo"
                className="w-10 h-10 object-contain rounded-xl"
              />
              <h1 className="text-2xl font-black text-primary tracking-tighter">Ilays</h1>
            </div>
          ) : (
            <div className="flex justify-center">
              <img
                src="/image.png"
                alt="Ilays Logo"
                className="w-10 h-10 object-contain rounded-xl"
              />
            </div>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-muted-foreground hover:bg-accent rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-card border border-border/60 rounded-full items-center justify-center hover:bg-accent transition-colors shadow-md"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-primary text-primary-foreground shadow-md font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  }`
                }
                title={isCollapsed ? item.label : ''}
              >
                {({ isActive }) => (
                  <>
                    {/* Left Accent Border */}
                    {isActive && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
                    )}
                    <Icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} transition-colors flex-shrink-0 ${isActive ? 'text-primary-foreground' : ''}`} />
                    {!isCollapsed && <span className="text-sm">{item.label}</span>}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className={`mt-6 pt-6 border-t border-border/60 ${isCollapsed ? 'px-2' : 'px-3'}`}>
            {!isCollapsed && (
              <p className="px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-3">
                Administration
              </p>
            )}
            {adminItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `relative flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-xl transition-all duration-200 group ${isActive
                      ? 'bg-primary text-primary-foreground shadow-md font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`
                  }
                  title={isCollapsed ? item.label : ''}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
                      )}
                      <Icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} transition-colors flex-shrink-0 ${isActive ? 'text-primary-foreground' : ''}`} />
                      {!isCollapsed && <span className="text-sm">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border/60">
        {!isCollapsed ? (
          <>
            <div className="flex items-center px-3 py-2 mb-2">
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center px-3 py-2.5 text-muted-foreground rounded-xl hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-3 py-2 text-muted-foreground rounded-xl hover:bg-accent/50 hover:text-foreground transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Sidebar
