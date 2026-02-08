import apiClient from './apiClient'

export const companyService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/companies', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/companies/${id}`)
    return response.data
  },

  create: async (companyData) => {
    const response = await apiClient.post('/companies', companyData)
    return response.data
  },

  update: async (id, companyData) => {
    const response = await apiClient.put(`/companies/${id}`, companyData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/companies/${id}`)
    return response.data
  },

  // Company Users
  getUsers: async (companyId) => {
    const response = await apiClient.get(`/companies/${companyId}/users`)
    return response.data
  },

  createUser: async (companyId, userData) => {
    const response = await apiClient.post(`/companies/${companyId}/users`, userData)
    return response.data
  },

  // Company Statistics
  getStats: async (companyId) => {
    const response = await apiClient.get(`/companies/${companyId}/stats`)
    return response.data
  },
}

