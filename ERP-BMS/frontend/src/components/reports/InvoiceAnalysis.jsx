import React, { useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import {
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    ArrowUpRight,
    TrendingUp,
    MoreHorizontal
} from 'lucide-react'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import { invoiceService } from '../../services/api/invoiceService'
import { format } from 'date-fns'

const InvoiceAnalysis = ({ dateRange }) => {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    // 1. Fetch Stats for KPIs and Charts
    const { data: statsData, isLoading: isStatsLoading } = useQuery(
        ['invoice-analysis-stats', dateRange],
        () => invoiceService.getStats({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            groupBy: 'day' // Default to daily trend
        }),
        { keepPreviousData: true }
    )

    // 2. Fetch Invoices for Table
    const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery(
        ['invoices-analysis-table', dateRange, page, search, statusFilter],
        () => invoiceService.getAll({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            page,
            limit: 10,
            search: search || undefined,
            status: statusFilter || undefined
        }),
        { keepPreviousData: true }
    )

    const stats = statsData?.data || {}
    const invoices = invoicesData?.data || []
    const pagination = invoicesData?.pagination || { page: 1, total: 0, pages: 1 }

    // DEBUG: Log to help diagnose why stats are zero
    if (statsData) {
        console.log('📊 [InvoiceAnalysis] Stats Response:', statsData)
        console.log('📊 [InvoiceAnalysis] Parsed stats:', stats)
        console.log('📊 [InvoiceAnalysis] Total Invoices:', stats.totalInvoices)
        console.log('📊 [InvoiceAnalysis] Total Revenue:', stats.totalRevenue)
    }


    // --- Helpers ---
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val || 0)

    // --- Chart Data Preparation ---
    const STATUS_COLORS = {
        paid: '#10b981',        // Green
        partially_paid: '#6366f1', // Indigo
        overdue: '#ef4444',     // Red
        sent: '#3b82f6',        // Blue
        draft: '#94a3b8'        // Slate (should be excluded usually)
    }

    const statusPieData = useMemo(() => {
        return (stats.byStatus || [])
            .filter(item => item._id !== 'draft' && item._id !== 'cancelled') // Ensure drafts excluded as per rules
            .map(item => ({
                name: item._id.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                value: item.count,
                color: STATUS_COLORS[item._id] || '#cbd5e1'
            }))
    }, [stats.byStatus])

    const trendData = useMemo(() => {
        return (stats.trend || []).map(item => ({
            date: format(new Date(item.date), 'MMM dd'),
            count: item.count,
            revenue: item.revenue
        }))
    }, [stats.trend])

    const paidVsOutstandingData = useMemo(() => {
        const revenue = stats.totalRevenue?.[0] || {}
        return [
            {
                name: 'Overview',
                Paid: revenue.paid || 0,
                Outstanding: revenue.outstanding || 0
            }
        ]
    }, [stats.totalRevenue])

    const totalInvoiced = stats.totalRevenue?.[0]?.totalInvoiced || 0
    const collected = stats.totalRevenue?.[0]?.paid || 0
    const outstanding = stats.totalRevenue?.[0]?.outstanding || 0
    const totalCount = stats.totalInvoices?.[0]?.count || 0

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* 1. Header Section (Context) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Invoice Analysis</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Track invoice performance and cash flow</p>
                </div>
                {/* Date range is controlled by parent Report.jsx, simplified display/control here if needed */}
            </div>

            {/* 2. KPI Cards Row */}
            {/* 2. KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Invoices */}
                <div className="group bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-slate-800 border-l-4 border-l-blue-500 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] md:text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Total Invoices</p>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                            <FileText className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="mt-1">
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-slate-100 tabular-nums tracking-tighter">
                            {totalCount}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1 uppercase tracking-wider">Active this period</p>
                    </div>
                </div>

                {/* Total Invoiced */}
                <div className="group bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-slate-800 border-l-4 border-l-emerald-500 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] md:text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Total Invoiced</p>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="mt-1">
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-slate-100 tabular-nums tracking-tighter">
                            {formatCurrency(totalInvoiced)}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1 uppercase tracking-wider">Revenue billed</p>
                    </div>
                </div>

                {/* Collected */}
                <div className="group bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-slate-800 border-l-4 border-l-green-600 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] md:text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Collected</p>
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="mt-1">
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-slate-100 tabular-nums tracking-tighter">
                            {formatCurrency(collected)}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1 uppercase tracking-wider">Payments received</p>
                    </div>
                </div>

                {/* Outstanding */}
                <div className="group bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-slate-800 border-l-4 border-l-amber-500 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] md:text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Outstanding</p>
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
                            <Clock className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="mt-1">
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-slate-100 tabular-nums tracking-tighter">
                            {formatCurrency(outstanding)}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1 uppercase tracking-wider">Amount due</p>
                    </div>
                </div>
            </div>

            {/* 3. Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Status Breakdown */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 h-[350px] flex flex-col">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Status Distribution</h3>
                    <p className="text-xs text-slate-500 italic mb-4">Current period</p>
                    <div className="flex-1 w-full min-h-0">
                        {isStatsLoading ? (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading...</div>
                        ) : statusPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 500 }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(value) => <span className="text-slate-600 dark:text-slate-300 font-medium ml-1">{value}</span>}
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">No data available</div>
                        )}
                    </div>
                </div>

                {/* Chart 2: Invoices Over Time */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 h-[350px] flex flex-col">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Invoice Trend</h3>
                    <p className="text-xs text-slate-500 italic mb-4">Daily activity</p>
                    <div className="flex-1 w-full min-h-0">
                        {isStatsLoading ? (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading...</div>
                        ) : trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 500 }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                        cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">No data available</div>
                        )}
                    </div>
                </div>

                {/* Chart 3: Paid vs Outstanding */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 h-[350px] flex flex-col">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Payment Status</h3>
                    <p className="text-xs text-slate-500 italic mb-4">Collected vs pending</p>
                    <div className="flex-1 w-full min-h-0">
                        {isStatsLoading ? (
                            <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paidVsOutstandingData} barSize={80}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `$${val / 1000}k`} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 500 }}
                                        formatter={(val) => formatCurrency(val)}
                                    />
                                    <Bar dataKey="Paid" fill="#10b981" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Outstanding" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. Invoice History Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-50 dark:border-slate-800/50 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 tracking-tight">Invoice History</h3>
                    </div>

                    <div className="relative flex-1 md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by invoice # or customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 md:py-2.5 bg-gray-50 dark:bg-slate-950/50 border border-transparent dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 rounded-2xl md:rounded-xl transition-all outline-none text-sm dark:text-slate-200"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Paid</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Outstanding</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-8">Due Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {isInvoicesLoading ? (
                                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading invoices...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No invoices found for this period.</td></tr>
                            ) : invoices.map((inv) => (
                                <tr key={inv._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">
                                        <span className="font-mono text-gray-500">#</span>{inv.invoiceNumber}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                                        {inv.customer?.fullName || 'Unknown Customer'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                inv.status === 'overdue' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    inv.status === 'partially_paid' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                        inv.status === 'sent' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                            {inv.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 dark:text-slate-100">
                                        {formatCurrency(inv.total)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                        {inv.amountPaid > 0 ? formatCurrency(inv.amountPaid) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right text-orange-600 dark:text-orange-400 font-medium">
                                        {inv.balanceDue > 0 ? formatCurrency(inv.balanceDue) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 pl-8">
                                        {format(new Date(inv.dueDate), 'MMM dd, yyyy')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/30 dark:bg-slate-900/30">
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                        Page {page} of {pagination.pages}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 disabled:opacity-50 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 disabled:opacity-50 transition-all"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InvoiceAnalysis
