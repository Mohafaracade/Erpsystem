import apiClient from './apiClient'

export const superAdminService = {
  // Dashboard Statistics
  getDashboardStats: async () => {
    const response = await apiClient.get('/super-admin/dashboard')
    return response.data.data
  },

  // Companies Management
  getAllCompanies: async (params = {}) => {
    const response = await apiClient.get('/super-admin/companies', { params })
    return response.data
  },

  getCompany: async (id) => {
    const response = await apiClient.get(`/super-admin/companies/${id}`)
    return response.data.data
  },

  createCompany: async (data) => {
    const response = await apiClient.post('/super-admin/companies', data)
    return response.data.data
  },

  updateCompany: async (id, data) => {
    const response = await apiClient.put(`/super-admin/companies/${id}`, data)
    return response.data.data
  },

  deleteCompany: async (id) => {
    const response = await apiClient.delete(`/super-admin/companies/${id}`)
    return response.data
  },

  // Users Management (Global)
  getAllUsers: async (params = {}) => {
    const response = await apiClient.get('/super-admin/users', { params })
    return response.data
  },

  getUser: async (id) => {
    const response = await apiClient.get(`/super-admin/users/${id}`)
    return response.data.data
  },

  createUser: async (data) => {
    const response = await apiClient.post('/super-admin/users', data)
    return response.data.data
  },

  updateUser: async (id, data) => {
    const response = await apiClient.put(`/super-admin/users/${id}`, data)
    return response.data.data
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/super-admin/users/${id}`)
    return response.data
  },

  // Subscriptions Management
  getAllSubscriptions: async (params = {}) => {
    const response = await apiClient.get('/super-admin/subscriptions', { params })
    return response.data
  },

  updateSubscription: async (companyId, data) => {
    const response = await apiClient.put(`/super-admin/subscriptions/${companyId}`, data)
    return response.data.data
  },

  // Global Reports
  getGlobalReports: async (params = {}) => {
    const response = await apiClient.get('/super-admin/reports', { params })
    return response.data.data
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    const response = await apiClient.get('/super-admin/audit-logs', { params })
    return response.data
  },

  // System Settings
  getSystemSettings: async () => {
    const response = await apiClient.get('/super-admin/settings')
    return response.data.data
  },

  updateSystemSettings: async (data) => {
    const response = await apiClient.put('/super-admin/settings', data)
    return response.data.data
  },
}

