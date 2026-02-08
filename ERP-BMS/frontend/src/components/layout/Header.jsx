import { Sun, Moon, RefreshCw, Menu, Building2 } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useQueryClient } from 'react-query'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import NotificationDropdown from './NotificationDropdown'

const Header = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.refetchQueries()
    setIsRefreshing(false)
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-colors duration-200 sticky top-0 z-30">
      <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between space-x-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Company Info - Only for non-super-admin users */}
        {user?.companyName && user?.role !== 'super_admin' && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{user.companyName}</span>
          </div>
        )}

        <div className="flex-1 flex items-center justify-end space-x-2 md:space-x-4">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all duration-200 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>

          {/* Notifications */}
          <NotificationDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header

