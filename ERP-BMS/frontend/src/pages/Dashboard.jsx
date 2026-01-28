import { useState } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  DollarSign, FileText, Users, TrendingUp, AlertTriangle,
  Plus, RefreshCw, Receipt, ShoppingCart, Clock
} from 'lucide-react'
import { reportService } from '../services/api/reportService'
import { useAuth } from '../contexts/AuthContext'
import GlobalDateRangePicker from '../components/common/GlobalDateRangePicker'
import { getPresetRange } from '../utils/datePresets'
import { StatCard } from '../components/ui/stat-card'
import { ChartCard } from '../components/ui/chart-card'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'

const QuickAction = ({ title, icon, onClick, color }) => (
  <Button
    onClick={onClick}
    variant="outline"
    className="flex-shrink-0 group h-auto p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200"
  >
    <div className="flex flex-row md:flex-col items-center gap-3 md:gap-2">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
        <div className="w-5 h-5 text-white">{icon}</div>
      </div>
      <span className="font-medium text-sm text-foreground whitespace-nowrap">{title}</span>
    </div>
  </Button>
)

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAuthorized = user?.role === 'admin' || user?.role === 'accountant'

  const [dateRange, setDateRange] = useState(() => getPresetRange('thisMonth'))

  // 1. Fetch Summary Stats (Only for Admin/Accountant)
  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary,
    error: summaryError
  } = useQuery(
    ['comprehensiveReports', dateRange],
    () => reportService.getComprehensiveReports(dateRange),
    {
      staleTime: 5 * 60 * 1000,
      enabled: isAuthorized
    }
  )

  const stats = summaryData?.data || {}

  // 2. Fetch Sales Trend (Real Data)
  const { data: trendResponse, isLoading: trendLoading } = useQuery(
    ['revenueTrend', dateRange],
    () => reportService.getRevenueTrend({ ...dateRange, groupBy: 'day' }),
    { staleTime: 10 * 60 * 1000 }
  )
  const trendData = trendResponse?.data || []

  // 3. Fetch Expenses by Category (Real Data)
  const { data: categoryResponse, isLoading: categoryLoading } = useQuery(
    ['expensesByCategory', dateRange],
    () => reportService.getExpensesByCategory(dateRange),
    { staleTime: 10 * 60 * 1000 }
  )
  const categoryData = categoryResponse?.data || []

  // 4. Fetch Recent Transactions (Real Data)
  const { data: transactionResponse, isLoading: transactionLoading } = useQuery(
    ['recentTransactions', dateRange],
    () => reportService.getDetailedTransactions({ ...dateRange, limit: 5 }),
    { staleTime: 2 * 60 * 1000 }
  )
  const transactions = transactionResponse?.data?.data || []

  const handleRefresh = () => {
    refetchSummary()
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-6 lg:p-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">Performance Overview</h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">Real-time business intelligence and financial metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <GlobalDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center justify-center gap-2 hover:border-primary/20"
          >
            <RefreshCw className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''}`} />
            <span className="md:hidden lg:inline font-medium">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {summaryError && isAuthorized && (
        <Card className="bg-destructive/5 border-destructive/20 mb-8">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                <span className="font-semibold">API Connection Error:</span> Failed to sync with live data service.
              </p>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Access Denied for Staff */}
      {!isAuthorized && (
        <Card className="bg-amber-50/50 border-amber-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
                <p className="text-amber-900 font-semibold text-lg">Limited Access</p>
                <p className="text-amber-800 text-sm mt-1.5 leading-relaxed">Financial reports and analytics are restricted to Admin and Accountant roles only.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards - Only for Admin/Accountant */}
      {isAuthorized && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="Total Revenue"
            value={`$${(stats.totalRevenue || 0).toLocaleString()}`}
            icon={DollarSign}
            color="bg-blue-600"
            loading={summaryLoading}
            isPrimary={true}
          />
          <StatCard
            title="Net Profit"
            value={`$${(stats.profit || 0).toLocaleString()}`}
            icon={TrendingUp}
            color="bg-emerald-600"
            loading={summaryLoading}
            isPrimary={true}
          />
          <StatCard
            title="Profit Margin"
            value={`${(stats.profitMargin || 0).toFixed(1)}%`}
            icon={TrendingUp}
            color="bg-indigo-600"
            loading={summaryLoading}
          />
          <StatCard
            title="Direct Expenses"
            value={`$${(stats.totalExpenses || 0).toLocaleString()}`}
            icon={AlertTriangle}
            color="bg-rose-600"
            loading={summaryLoading}
          />
        </div>
      )}

      {/* Dashboard Core Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Sales Trend Chart */}
        <div className="xl:col-span-2 space-y-6">
          <ChartCard
            title="Daily Revenue Flow"
            icon={TrendingUp}
            iconColor="text-primary/70"
          >
            <div className="h-[300px] md:h-[400px] w-full overflow-x-auto">
              <div className="h-full min-w-[600px] md:min-w-full">
                {trendLoading ? (
                  <div className="h-full flex items-center justify-center bg-muted/10 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.4} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 11 }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 11 }} 
                        tickFormatter={(value) => `$${value}`} 
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderRadius: '10px',
                          border: 'none',
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                          padding: '12px 16px',
                          backdropFilter: 'blur(8px)'
                        }}
                        itemStyle={{ color: '#f8fafc', fontWeight: '600', fontSize: '13px' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        formatter={(value) => [`$${(value || 0).toLocaleString()}`, 'Value']}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.7} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Clock className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No transactional data available</p>
                  </div>
                )}
              </div>
            </div>
          </ChartCard>

          {/* Quick Actions */}
          <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-4 md:pb-0 hide-scrollbar scroll-smooth">
            <QuickAction title="New Invoice" icon={<Plus />} onClick={() => navigate('/invoices/create')} color="bg-blue-600" />
            <QuickAction title="Add Customer" icon={<Users />} onClick={() => navigate('/customers', { state: { openCreateForm: true } })} color="bg-indigo-600" />
            <QuickAction title="Add Expense" icon={<Receipt />} onClick={() => navigate('/expenses/create')} color="bg-rose-600" />
            <QuickAction title="New Sale" icon={<ShoppingCart />} onClick={() => navigate('/sales/create')} color="bg-emerald-600" />
          </div>
        </div>

        {/* Sidebar Components */}
        <div className="space-y-6">
          {/* Expenses Pie Chart */}
          <ChartCard
            title="Expense Allocation"
            icon={TrendingUp}
            iconColor="text-rose-500/70"
          >
            <div className="h-64 lg:h-80 w-full">
              {categoryLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                </div>
              ) : categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '10px',
                        border: 'none',
                        color: '#fff',
                        padding: '10px 14px',
                        backdropFilter: 'blur(8px)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm font-medium">No expenses recorded yet</p>
                </div>
              )}
            </div>
          </ChartCard>

          {/* Recent Activity List */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-primary/70" />
                  <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
                </div>
                <Button
                onClick={() => navigate('/reports')}
                  variant="ghost"
                  size="sm"
                  className="text-xs font-medium text-primary uppercase tracking-wider hover:bg-primary/5"
              >
                View All
                </Button>
              </div>
              <div className="space-y-3">
              {transactionLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted/50 rounded-xl"></div>
                    <div className="flex-1 space-y-3">
                        <div className="h-3 bg-muted/50 rounded w-full"></div>
                        <div className="h-2 bg-muted/30 rounded w-1/2"></div>
                    </div>
                  </div>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 hover:bg-accent/50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-border/50">
                    <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tx.type === 'Invoice' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                          {tx.type === 'Invoice' ? <FileText className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[140px] md:max-w-[200px]">{tx.customer}</p>
                          <p className="text-xs text-muted-foreground mt-1">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-semibold text-foreground">${(tx.amount || 0).toLocaleString()}</p>
                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md mt-1.5 inline-block ${tx.status === 'paid' ? 'bg-green-50 text-green-700' :
                          tx.status === 'partially_paid' ? 'bg-blue-50 text-blue-700' :
                            'bg-muted text-muted-foreground'
                        }`}>
                        {tx.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">No recent transactions found</div>
              )}
            </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
