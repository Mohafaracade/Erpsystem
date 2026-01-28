import apiClient from './apiClient'

export const dashboardService = {
  /**
   * Get total sales
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Total sales data
   */
  getTotalSales: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/total-sales', { params: filters })
    return response.data
  },

  /**
   * Get total invoices count
   * @param {Object} filters - Date range and status filters
   * @returns {Promise<Object>} Total invoices data
   */
  getTotalInvoices: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/total-invoices', { params: filters })
    return response.data
  },

  /**
   * Get unpaid and overdue invoices
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Unpaid/overdue invoices data
   */
  getUnpaidInvoices: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/unpaid-invoices', { params: filters })
    return response.data
  },

  /**
   * Get total customers count
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Total customers data
   */
  getTotalCustomers: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/total-customers', { params: filters })
    return response.data
  },

  /**
   * Get total expenses
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Total expenses data
   */
  getTotalExpenses: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/total-expenses', { params: filters })
    return response.data
  },

  /**
   * Get sales chart data
   * @param {Object} filters - Date range and grouping filters
   * @returns {Promise<Array>} Sales chart data
   */
  getSalesChart: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/sales-chart', { params: filters })
    return response.data
  },

  /**
   * Get expenses vs income data
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Expenses vs income data
   */
  getExpensesIncome: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/expenses-income', { params: filters })
    return response.data
  },

  /**
   * Get invoice status chart data
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Invoice status chart data
   */
  getInvoiceStatusChart: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/invoice-status-chart', { params: filters })
    return response.data
  },

  /**
   * Get comprehensive dashboard data (single endpoint)
   * @param {Object} filters - All filters combined
   * @returns {Promise<Object>} Complete dashboard data
   */
  getComprehensiveDashboard: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/comprehensive', { params: filters })
    return response.data
  },

  /**
   * Get dashboard summary stats
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Dashboard summary
   */
  getDashboardStats: async (filters = {}) => {
    const response = await apiClient.get('/dashboard/stats', { params: filters })
    return response.data
  },
}
