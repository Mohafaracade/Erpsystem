import * as React from "react"
import { Card, CardContent } from "./card"
import { cn } from "../../lib/utils"

const StatCard = React.forwardRef(({ 
  title, 
  value, 
  icon: Icon, 
  color = "bg-blue-600",
  loading = false,
  isPrimary = false,
  className,
  ...props 
}, ref) => {
  if (loading) {
    return (
      <Card ref={ref} className={cn("animate-pulse", className)} {...props}>
        <CardContent className="p-6">
          <div className="h-3 bg-muted rounded mb-3 w-24"></div>
          <div className="h-8 bg-muted rounded w-32 mb-2"></div>
        </CardContent>
      </Card>
    )
  }

  // Softer pastel colors for icons (reduced opacity)
  const iconColorMap = {
    'bg-blue-600': 'bg-blue-50',
    'bg-emerald-600': 'bg-emerald-50',
    'bg-indigo-600': 'bg-indigo-50',
    'bg-rose-600': 'bg-rose-50',
  }

  const iconTextColorMap = {
    'bg-blue-600': 'text-blue-600',
    'bg-emerald-600': 'text-emerald-600',
    'bg-indigo-600': 'text-indigo-600',
    'bg-rose-600': 'text-rose-600',
  }

  return (
    <Card 
      ref={ref} 
      className={cn(
        "hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5",
        isPrimary && "ring-2 ring-primary/10",
        className
      )} 
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
              {title}
            </p>
            <p className={cn(
              "font-bold text-foreground truncate leading-tight",
              isPrimary ? "text-3xl" : "text-2xl"
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
          {Icon && (
            <div className={cn(
              "p-3 rounded-xl flex-shrink-0",
              iconColorMap[color] || "bg-gray-50"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                iconTextColorMap[color] || "text-gray-600"
              )} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
StatCard.displayName = "StatCard"

export { StatCard }
