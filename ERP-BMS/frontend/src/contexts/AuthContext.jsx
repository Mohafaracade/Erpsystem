import { createContext, useContext, useState, useEffect } from 'react'
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
    toast.success('Logged out successfully')
  }

  const updateUser = (userData) => {
    setUser(userData)
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

