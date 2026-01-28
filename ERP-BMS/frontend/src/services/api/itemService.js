import apiClient from './apiClient'

export const itemService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/items', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/items/${id}`)
    return response.data
  },

  create: async (itemData) => {
    const response = await apiClient.post('/items', itemData)
    return response.data
  },

  update: async (id, itemData) => {
    const response = await apiClient.put(`/items/${id}`, itemData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/items/${id}`)
    return response.data
  },
}

