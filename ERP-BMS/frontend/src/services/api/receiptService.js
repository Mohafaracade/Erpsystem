import apiClient from './apiClient'

export const receiptService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/receipts', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/receipts/${id}`)
    return response.data
  },

  create: async (receiptData) => {
    const response = await apiClient.post('/receipts', receiptData)
    return response.data
  },

  createFromInvoice: async (payload) => {
    const response = await apiClient.post('/receipts/from-invoice', payload)
    return response.data
  },

  update: async (id, receiptData) => {
    const response = await apiClient.put(`/receipts/${id}`, receiptData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/receipts/${id}`)
    return response.data
  },
}

