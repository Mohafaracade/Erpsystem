import React, { useMemo } from 'react'
import {
    FileText,
    CheckCircle,
    Clock,
    TrendingUp,
} from 'lucide-react'
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

const InvoiceAnalyticsHeader = ({ stats, loading }) => {
    // --- Helpers ---
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val || 0)

    const STATUS_COLORS = {
        paid: '#10b981',        // Green
        partially_paid: '#6366f1', // Indigo
        overdue: '#ef4444',     // Red
        sent: '#3b82f6',        // Blue
        draft: '#94a3b8'        // Slate
    }

    const statusPieData = useMemo(() => {
        return (stats?.byStatus || [])
            .filter(item => item._id !== 'draft' && item._id !== 'cancelled')
            .map(item => ({
                name: item._id.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                value: item.count,
                color: STATUS_COLORS[item._id] || '#cbd5e1'
            }))
    }, [stats?.byStatus])

    const trendData = useMemo(() => {
        return (stats?.trend || []).map(item => ({
            date: format(new Date(item.date), 'MMM dd'),
            count: item.count,
            revenue: item.revenue
        }))
    }, [stats?.trend])

    const paidVsOutstandingData = useMemo(() => {
        const revenue = stats?.totalRevenue?.[0] || {}
        return [
            {
                name: 'Overview',
                Paid: revenue.paid || 0,
                Outstanding: revenue.outstanding || 0
            }
        ]
    }, [stats?.totalRevenue])

    const totalInvoiced = stats?.totalRevenue?.[0]?.totalInvoiced || 0
    const collected = stats?.totalRevenue?.[0]?.paid || 0
    const outstanding = stats?.totalRevenue?.[0]?.outstanding || 0
    const totalCount = stats?.totalInvoices?.[0]?.count || 0

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-[320px] bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Total Invoices" value={totalCount} subtitle="Active this period" icon={FileText} color="blue" />
                <KPICard title="Total Invoiced" value={formatCurrency(totalInvoiced)} subtitle="Revenue billed" icon={TrendingUp} color="emerald" />
                <KPICard title="Collected" value={formatCurrency(collected)} subtitle="Payments received" icon={CheckCircle} color="green" />
                <KPICard title="Outstanding" value={formatCurrency(outstanding)} subtitle="Amount due" icon={Clock} color="amber" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Status Distribution" subtitle="Current period">
                    <div className="h-full w-full overflow-x-auto hide-scrollbar">
                        <div className="h-full min-w-[250px]">
                            {statusPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {statusPieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="Invoice Trend" subtitle="Daily activity">
                    <div className="h-full w-full overflow-x-auto hide-scrollbar">
                        <div className="h-full min-w-[300px]">
                            {trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                                        />
                                        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="Payment Status" subtitle="Collected vs pending">
                    <div className="h-full w-full overflow-x-auto hide-scrollbar">
                        <div className="h-full min-w-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paidVsOutstandingData} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(val) => `$${val / 1000}k`} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                                        formatter={formatCurrency}
                                    />
                                    <Bar dataKey="Paid" fill="#10b981" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="Outstanding" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </ChartCard>
            </div>
        </div>
    )
}

const KPICard = ({ title, value, subtitle, icon: Icon, color }) => {
    const colorClasses = {
        blue: 'text-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
        emerald: 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10',
        green: 'text-green-600 bg-green-50/50 dark:bg-green-900/10',
        amber: 'text-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
    }
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-all duration-200 hover:shadow-md group">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{title}</p>
            </div>
            <div>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight truncate">{value}</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-widest">{subtitle}</p>
            </div>
        </div>
    )
}

const ChartCard = ({ title, subtitle, children }) => (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-slate-800 h-[360px] md:h-[400px] flex flex-col">
        <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 tracking-tight">{title}</h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest mb-6">{subtitle}</p>
        <div className="flex-1 min-h-0">{children}</div>
    </div>
)

const NoData = () => <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium italic">No data available</div>

export default InvoiceAnalyticsHeader
