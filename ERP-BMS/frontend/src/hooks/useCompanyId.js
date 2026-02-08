import { useAuth } from '../contexts/AuthContext'

/**
 * ✅ FIX: Hook to get companyId consistently across the app
 * Returns 'super_admin' for super_admin users (global scope)
 * Returns company._id for regular users
 * Returns null if not authenticated
 */
export const useCompanyId = () => {
  const { companyId } = useAuth()
  return companyId
}

