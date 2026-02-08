import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useQueryClient } from 'react-query'
import { authService } from '../services/api/authService'
import { toast } from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ✅ FIX: Extract companyId from user object consistently
const getCompanyId = (user) => {
  if (!user) return null
  if (user.role === 'super_admin') return 'super_admin' // Global scope
  if (user.company?._id) return user.company._id.toString()
  if (user.company) return user.company.toString()
  return null
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const queryClient = useQueryClient()
  const previousCompanyIdRef = useRef(null)

  // ✅ FIX: Extract companyId from user
  const companyId = getCompanyId(user)

  // ✅ FIX: Clear React Query cache when company changes
  useEffect(() => {
    if (companyId && previousCompanyIdRef.current !== null && previousCompanyIdRef.current !== companyId) {
      // Company changed - clear all cached data
      queryClient.clear()
      console.log('[AuthContext] Company changed, cleared React Query cache')
    }
    previousCompanyIdRef.current = companyId
  }, [companyId, queryClient])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const meResponse = await authService.getMe()
        const meUser = meResponse?.data?.user || meResponse?.user || null
        setUser(meUser)
        setIsAuthenticated(true)
      }
    } catch (error) {
      localStorage.removeItem('token')
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password)
      const token = response?.data?.token || response?.token
      const loggedInUser = response?.data?.user || response?.user

      if (!token) {
        throw new Error('Login did not return a token')
      }

      // ✅ FIX: Clear React Query cache on login to prevent data leakage
      queryClient.clear()
      previousCompanyIdRef.current = null

      localStorage.setItem('token', token)
      setUser(loggedInUser)
      setIsAuthenticated(true)
      toast.success('Login successful!')
      return response
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const response = await authService.register(userData)

      // Don't auto-login after registration
      // User will be redirected to login page to enter credentials
      toast.success('Registration successful! Please login with your credentials.')
      return response
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed')
      throw error
    }
  }

  const logout = () => {
    // ✅ FIX: Clear React Query cache on logout to prevent data leakage
    queryClient.clear()
    previousCompanyIdRef.current = null

    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
    toast.success('Logged out successfully')
  }

  const updateUser = (userData) => {
    setUser(userData)
  }

  // Helper functions for role checking
  const isSuperAdmin = () => user?.role === 'super_admin'
  const isCompanyAdmin = () => user?.role === 'company_admin'
  const isAdmin = () => ['super_admin', 'company_admin', 'admin'].includes(user?.role)
  // ✅ SECURITY FIX: Only super_admin and company_admin can manage users (admin role excluded)
  const canManageUsers = () => ['super_admin', 'company_admin'].includes(user?.role)
  const canManageCompanies = () => isSuperAdmin()

  const value = {
    user,
    loading,
    isAuthenticated,
    companyId, // ✅ FIX: Expose companyId for use in query keys
    login,
    register,
    logout,
    updateUser,
    // Role helpers
    isSuperAdmin,
    isCompanyAdmin,
    isAdmin,
    canManageUsers,
    canManageCompanies,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

