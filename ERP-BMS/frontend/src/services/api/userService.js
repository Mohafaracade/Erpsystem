import apiClient from './apiClient'

export const userService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/users', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },

  create: async (userData) => {
    const response = await apiClient.post('/users', userData)
    return response.data
  },

  update: async (id, userData) => {
    const response = await apiClient.put(`/users/${id}`, userData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/users/${id}`)
    return response.data
  },
}

