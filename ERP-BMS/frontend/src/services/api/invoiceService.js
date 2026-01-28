import apiClient from './apiClient'

export const invoiceService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/invoices', { params })
    return response.data
  },

  getUnpaidByCustomer: async (customerId) => {
    const response = await apiClient.get('/invoices/unpaid', {
      params: { customerId },
    })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/invoices/${id}`)
    return response.data
  },

  create: async (invoiceData) => {
    const response = await apiClient.post('/invoices', invoiceData)
    return response.data
  },

  update: async (id, invoiceData) => {
    const response = await apiClient.put(`/invoices/${id}`, invoiceData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/invoices/${id}`)
    return response.data
  },

  generatePDF: async (id) => {
    const response = await apiClient.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    })
    return response.data
  },
  getStats: async (params = {}) => {
    const response = await apiClient.get('/invoices/stats/overview', { params })
    return response.data
  },
  recordPayment: async (id, paymentData) => {
    const response = await apiClient.post(`/invoices/${id}/payments`, paymentData)
    return response.data
  },
  markAsSent: async (id) => {
    const response = await apiClient.patch(`/invoices/${id}/send`)
    return response.data
  },
  checkDuplicate: async (invoiceData) => {
    const response = await apiClient.post('/invoices/check-duplicate', invoiceData)
    return response.data
  },
}

