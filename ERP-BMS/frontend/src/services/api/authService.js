import apiClient from './apiClient'

export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData) => {
    // Registration is disabled - this will return 403
    const response = await apiClient.post('/auth/register', userData)
    return response.data
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}

