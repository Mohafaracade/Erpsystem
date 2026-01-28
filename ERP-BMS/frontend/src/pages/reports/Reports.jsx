import { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { reportService } from '../../services/api/reportService'
import KPICard from '../../components/reports/KPICard'
import GlobalDateRangePicker from '../../components/common/GlobalDateRangePicker'
import { getPresetRange } from '../../utils/datePresets'
import InvoiceAnalysis from '../../components/reports/InvoiceAnalysis'
import { ChartCard } from '../../components/ui/chart-card'
import { StatCard } from '../../components/ui/stat-card'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState(() => getPresetRange('thisMonth'))

  // Fetch comprehensive reports data
  const { data: reportsData, isLoading, error } = useQuery(
    ['comprehensiveReports', dateRange],
    () => reportService.getComprehensiveReports(dateRange),
    { staleTime: 2 * 60 * 1000 }
  )

  // Fetch revenue trend data
  const { data: revenueTrendData } = useQuery(
    ['revenueTrend', dateRange],
    () => reportService.getRevenueTrend({ ...dateRange, groupBy: 'day' }),
    { staleTime: 5 * 60 * 1000 }
  )

  // Fetch expense breakdown
  const { data: expenseData } = useQuery(
    ['expensesByCategory', dateRange],
    () => reportService.getExpensesByCategory(dateRange),
    { staleTime: 5 * 60 * 1000 }
  )

  // Fetch top customers
  const { data: topCustomersData } = useQuery(
    ['topCustomers', dateRange],
    () => reportService.getTopCustomers({ ...dateRange, limit: 10 }),
    { staleTime: 5 * 60 * 1000 }
  )

  // Fetch invoice status distribution
  const { data: invoiceStatusData } = useQuery(
    ['invoiceStatus', dateRange],
    () => reportService.getInvoiceStatusDistribution(dateRange),
    { staleTime: 5 * 60 * 1000 }
  )

  // Expense Analysis - Expense Trend
  const { data: expenseTrendResponse, isLoading: etLoading } = useQuery(
    ['expenseTrend', dateRange],
    () => reportService.getExpenseTrend({ ...dateRange, groupBy: 'day' }),
    {
      staleTime: 5 * 60 * 1000,
      enabled: activeTab === 'expenses'
    }
  )

  // Expense Analysis - Expense Metrics
  const { data: expenseMetricsResponse, isLoading: emLoading } = useQuery(
    ['expenseMetrics', dateRange],
    () => reportService.getExpenseMetrics(dateRange),
    {
      staleTime: 5 * 60 * 1000,
      enabled: activeTab === 'expenses'
    }
  )

  const stats = reportsData?.data || {}
  const trendData = revenueTrendData?.data || []
  const expenseCategories = expenseData?.data || []
  const topCustomers = topCustomersData?.data || []
  const invoiceStatus = invoiceStatusData?.data || []
  const expenseTrendData = expenseTrendResponse?.data || []
  const expenseMetrics = expenseMetricsResponse?.data || {}

  // KPI Cards Data
  const kpiData = useMemo(() => [
    {
      title: 'Total Revenue',
      value: stats.totalRevenue || 0,
      trend: (stats.revenueChange || 0) >= 0 ? 'up' : 'down',
      trendValue: stats.revenueChange || 0,
      icon: DollarSign,
      color: 'blue',
      prefix: '$'
    },
    {
      title: 'Total Expenses',
      value: stats.totalExpenses || 0,
      trend: (stats.expensesChange || 0) >= 0 ? 'down' : 'up',
      trendValue: Math.abs(stats.expensesChange || 0),
      icon: AlertCircle,
      color: 'rose',
      prefix: '$'
    },
    {
      title: 'Net Profit',
      value: stats.profit || 0,
      trend: (stats.profitChange || 0) >= 0 ? 'up' : 'down',
      trendValue: stats.profitChange || 0,
      icon: TrendingUp,
      color: 'emerald',
      prefix: '$'
    },
    {
      title: 'Outstanding',
      value: stats.outstanding || 0,
      trend: (stats.outstandingChange || 0) >= 0 ? 'down' : 'up',
      trendValue: Math.abs(stats.outstandingChange || 0),
      icon: FileText,
      color: 'amber',
      prefix: '$'
    }
  ], [stats])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'invoice', label: 'Invoice Analysis', icon: FileText },
    { id: 'expenses', label: 'Expense Analysis', icon: AlertCircle }
  ]

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  const handleExport = () => {
    console.log('Exporting reports...')
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Unable to Load Reports
        </h2>
        <p className="text-muted-foreground max-w-md">
          {error?.response?.data?.message || 'Failed to fetch analytics data. Please try again later.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Business intelligence and financial insights</p>
        </div>

        <div className="flex items-center gap-2">
          <GlobalDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto hide-scrollbar">
        <nav className="flex gap-6 whitespace-nowrap min-w-max px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 pb-4 px-1 border-b-2 transition-all relative",
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Render Active Tab Content */}
      {activeTab === 'invoice' && <InvoiceAnalysis dateRange={dateRange} />}

      {/* KPI Cards */}
      {activeTab !== 'expenses' && activeTab !== 'invoice' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} loading={isLoading} />
          ))}
        </div>
      )}

      {/* Charts Section */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Revenue vs Expenses Trend */}
          <ChartCard
            title="Revenue vs Expenses"
            icon={TrendingUp}
            iconColor="text-blue-500"
          >
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                      itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 500 }}
                      formatter={(value) => [`$${value.toLocaleString()}`, '']}
                      labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      name="Expenses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No data available for selected period</p>
                </div>
              )}
            </div>
          </ChartCard>

          {/* Expense Breakdown */}
          <ChartCard
            title="Expense Breakdown"
            icon={AlertCircle}
            iconColor="text-rose-500"
          >
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : expenseCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      labelLine={false}
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 500 }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No expense data available</p>
                </div>
              )}
            </div>
          </ChartCard>

          {/* Top Customers */}
          <ChartCard
            title="Top 10 Customers"
            icon={BarChart3}
            iconColor="text-indigo-500"
          >
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : topCustomers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      width={100}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No customer data available</p>
                </div>
              )}
            </div>
          </ChartCard>

          {/* Invoice Status Distribution */}
          <ChartCard
            title="Invoice Status"
            icon={FileText}
            iconColor="text-amber-500"
          >
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : invoiceStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={invoiceStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="status"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={40} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No invoice status data available</p>
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Expense Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Expenses"
              value={`$${(expenseMetrics.totalExpenses || 0).toLocaleString()}`}
              icon={DollarSign}
              color="bg-rose-600"
            />
            <StatCard
              title="Avg Expense"
              value={`$${(expenseMetrics.avgExpense || 0).toLocaleString()}`}
              icon={TrendingUp}
              color="bg-blue-600"
            />
            <StatCard
              title="Daily Burn Rate"
              value={`$${(expenseMetrics.dailyBurnRate || 0).toLocaleString()}`}
              icon={AlertCircle}
              color="bg-amber-600"
            />
            <StatCard
              title="Highest Expense"
              value={`$${(expenseMetrics.maxExpense || 0).toLocaleString()}`}
              icon={FileText}
              color="bg-indigo-600"
            />
          </div>

          {/* Expense Trend Chart */}
          <ChartCard
            title="Expense Trend"
            icon={TrendingUp}
            iconColor="text-rose-500"
          >
            <div className="h-80">
              {etLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : expenseTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={expenseTrendData}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No expense trend data available</p>
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  )
}

export default Reports
