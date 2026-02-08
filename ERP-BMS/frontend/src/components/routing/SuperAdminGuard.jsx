import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

/**
 * SuperAdminGuard - Protects routes that require super_admin role
 * Redirects to /403 if user is not super_admin
 */
const SuperAdminGuard = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}

export default SuperAdminGuard

