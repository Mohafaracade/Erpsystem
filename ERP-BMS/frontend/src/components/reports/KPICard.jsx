import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { cn } from '../../lib/utils'

const KPICard = ({
    title,
    value,
    trend,
    trendValue,
    icon: Icon,
    color = 'blue',
    prefix = '',
    suffix = '',
    loading = false
}) => {
    const colorClasses = {
        blue: { border: 'border-l-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
        emerald: { border: 'border-l-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
        amber: { border: 'border-l-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
        rose: { border: 'border-l-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' },
        indigo: { border: 'border-l-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
        purple: { border: 'border-l-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' }
    }

    const currentTheme = colorClasses[color] || colorClasses.blue

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardContent className="p-6">
                    <div className="h-3 bg-muted/50 rounded w-24 mb-4"></div>
                    <div className="h-10 bg-muted/50 rounded w-32 mb-3"></div>
                    <div className="h-4 bg-muted/30 rounded w-16"></div>
                </CardContent>
            </Card>
        )
    }

    const isPositive = trend === 'up'
    const isNeutral = trend === 'neutral'

    let TrendIcon = Minus
    let trendColorClass = 'text-muted-foreground'

    if (!isNeutral && trendValue !== 0) {
        TrendIcon = isPositive ? TrendingUp : TrendingDown
        trendColorClass = isPositive ? 'text-emerald-600' : 'text-rose-600'
    }

    return (
        <Card className={cn(
            "group border-l-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5",
            currentTheme.border
        )}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {title}
                    </p>
                    {Icon && (
                        <div className={cn(
                            "p-2.5 rounded-xl transition-all duration-200 group-hover:scale-105",
                            currentTheme.bg,
                            currentTheme.text
                        )}>
                            <Icon className="w-4 h-4" />
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums tracking-tight leading-none">
                        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
                    </h3>

                    {trendValue !== undefined && (
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-md",
                                isPositive ? 'bg-emerald-50' : isNeutral ? 'bg-muted' : 'bg-rose-50'
                            )}>
                                <TrendIcon className={cn("w-3.5 h-3.5", trendColorClass)} />
                                <span className={cn("text-xs font-semibold", trendColorClass)}>
                                    {Math.abs(trendValue).toFixed(1)}%
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                vs last month
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default KPICard
