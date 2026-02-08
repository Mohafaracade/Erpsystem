import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const AdminRoute = ({ children, requireSuperAdmin = false }) => {
  const { isAuthenticated, loading, isSuperAdmin, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireSuperAdmin && !isSuperAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  if (!requireSuperAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default AdminRoute

