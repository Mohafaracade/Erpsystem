import apiClient from './apiClient'

export const expenseService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/expenses', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/expenses/${id}`)
    return response.data
  },

  create: async (expenseData) => {
    const response = await apiClient.post('/expenses', expenseData)
    return response.data
  },

  update: async (id, expenseData) => {
    const response = await apiClient.put(`/expenses/${id}`, expenseData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/expenses/${id}`)
    return response.data
  },

  updateStatus: async (id, status) => {
    const response = await apiClient.put(`/expenses/${id}/status`, { status })
    return response.data
  },
}

