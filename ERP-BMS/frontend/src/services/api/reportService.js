import apiClient from './apiClient'

export const reportService = {
  /**
   * Get comprehensive reports data
   * @param {Object} filters - Query parameters
   * @param {string} filters.startDate - Start date (YYYY-MM-DD)
   * @param {string} filters.endDate - End date (YYYY-MM-DD)
   * @param {string} filters.search - Search term for transactions
   * @param {string} filters.sort - Sort field (date, type, customer, amount, status)
   * @param {string} filters.sortDirection - Sort direction (asc, desc)
   * @param {number} filters.page - Page number for pagination
   * @param {number} filters.limit - Items per page
   * @param {string} filters.groupBy - Grouping for trend data (day, week, month)
   * @returns {Promise<Object>} Reports data with summary, charts, and transactions
   */
  getReports: async (filters = {}) => {
    const response = await apiClient.get('/reports', { params: filters })
    return response.data
  },

  /**
   * Export reports data as PDF or Excel
   * @param {string} type - Export type ('pdf' or 'excel')
   * @param {Object} filters - Same filters as getReports
   * @returns {Promise<Blob>} File blob for download
   */
  exportReports: async (type, filters = {}) => {
    if (!['pdf', 'excel'].includes(type)) {
      throw new Error('Export type must be "pdf" or "excel"')
    }

    const response = await apiClient.get(`/reports/export/${type}`, {
      params: filters,
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Get dashboard summary stats only
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Summary statistics
   */
  getDashboardStats: async (filters = {}) => {
    const response = await apiClient.get('/reports/dashboard', { params: filters })
    return response.data
  },

  /**
   * Get revenue trend data
   * @param {Object} filters - Date range and grouping filters
   * @returns {Promise<Array>} Revenue trend data points
   */
  getRevenueTrend: async (filters = {}) => {
    const response = await apiClient.get('/reports/revenue-trend', { params: filters })
    return response.data
  },

  /**
   * Get monthly sales data
   * @param {Object} filters - Date range filters
   * @returns {Promise<Array>} Monthly sales data
   */
  getMonthlySales: async (filters = {}) => {
    const response = await apiClient.get('/reports/monthly-sales', { params: filters })
    return response.data
  },

  /**
   * Get expenses grouped by category
   * @param {Object} filters - Date range filters
   * @returns {Promise<Array>} Expenses by category data
   */
  getExpensesByCategory: async (filters = {}) => {
    const response = await apiClient.get('/reports/expenses-by-category', { params: filters })
    return response.data
  },

  /**
   * Get detailed transactions with pagination
   * @param {Object} filters - Search, sort, and pagination filters
   * @returns {Promise<Object>} Paginated transactions data
   */
  getDetailedTransactions: async (filters = {}) => {
    const response = await apiClient.get('/reports/transactions', { params: filters })
    return response.data
  },

  /**
   * Get comprehensive reports data (single endpoint for all data)
   * @param {Object} filters - All filters combined
   * @returns {Promise<Object>} Complete reports data
   */
  getComprehensiveReports: async (filters = {}) => {
    const response = await apiClient.get('/reports/comprehensive', { params: filters })
    return response.data
  },

  /**
   * Get profit and loss statement
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Profit and loss data
   */
  getProfitLoss: async (filters = {}) => {
    const response = await apiClient.get('/reports/profit-loss', { params: filters })
    return response.data
  },

  /**
   * Get sales report
   * @param {Object} filters - Date range and grouping filters
   * @returns {Promise<Object>} Sales report data
   */
  getSalesReport: async (filters = {}) => {
    const response = await apiClient.get('/reports/sales', { params: filters })
    return response.data
  },

  /**
   * Get expense report
   * @param {Object} filters - Date range and category filters
   * @returns {Promise<Object>} Expense report data
   */
  getExpenseReport: async (filters = {}) => {
    const response = await apiClient.get('/reports/expenses', { params: filters })
    return response.data
  },

  /**
   * Export PDF (convenience method)
   * @param {Object} filters - Export filters
   * @returns {Promise<Blob>} PDF blob
   */
  exportPDF: async (filters = {}) => {
    return reportService.exportReports('pdf', filters)
  },

  /**
   * Export Excel (convenience method)
   * @param {Object} filters - Export filters
   * @returns {Promise<Blob>} Excel blob
   */
  exportExcel: async (filters = {}) => {
    return reportService.exportReports('excel', filters)
  },

  /**
   * Get top customers by revenue
   * @param {Object} filters - Date range and limit filters
   * @returns {Promise<Array>} Top customers data
   */
  getTopCustomers: async (filters = {}) => {
    const response = await apiClient.get('/reports/top-customers', { params: filters })
    return response.data
  },

  /**
   * Get invoice status distribution
   * @param {Object} filters - Date range filters
   * @returns {Promise<Array>} Status distribution data
   */
  getInvoiceStatusDistribution: async (filters = {}) => {
    const response = await apiClient.get('/reports/invoice-status', { params: filters })
    return response.data
  },

  /**
   * Get revenue breakdown by payment method
   * @param {Object} filters - Date range filters
   * @returns {Promise<Array>} Revenue by payment method data
   */
  getRevenueByPaymentMethod: async (filters = {}) => {
    const response = await apiClient.get('/reports/revenue-by-payment-method', { params: filters })
    return response.data
  },

  /**
   * Get payment velocity metrics
   * @param {Object} filters - Date range filters
   * @returns {Promise<Array>} Payment velocity data
   */
  getPaymentVelocity: async (filters = {}) => {
    const response = await apiClient.get('/reports/payment-velocity', { params: filters })
    return response.data
  },

  /**
   * Get collection rate metrics
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Collection rate statistics
   */
  getCollectionRate: async (filters = {}) => {
    const response = await apiClient.get('/reports/collection-rate', { params: filters })
    return response.data
  },

  /**
   * Get expense trend over time
   * @param {Object} filters - Date range and grouping filters
   * @returns {Promise<Array>} Expense trend data
   */
  getExpenseTrend: async (filters = {}) => {
    const response = await apiClient.get('/reports/expense-trend', { params: filters })
    return response.data
  },

  /**
   * Get top vendors by spending
   * @param {Object} filters - Date range and limit filters
   * @returns {Promise<Array>} Top vendors data
   */
  getTopVendors: async (filters = {}) => {
    const response = await apiClient.get('/reports/top-vendors', { params: filters })
    return response.data
  },

  /**
   * Get expense metrics
   * @param {Object} filters - Date range filters
   * @returns {Promise<Object>} Expense metrics
   */
  getExpenseMetrics: async (filters = {}) => {
    const response = await apiClient.get('/reports/expense-metrics', { params: filters })
    return response.data
  },
}

