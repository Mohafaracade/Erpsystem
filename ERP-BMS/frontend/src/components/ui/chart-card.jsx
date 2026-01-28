import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card"
import { cn } from "../../lib/utils"

const ChartCard = React.forwardRef(({ 
  title, 
  description,
  icon: Icon,
  iconColor = "text-muted-foreground",
  children,
  className,
  ...props 
}, ref) => {
  return (
    <Card ref={ref} className={cn("hover:shadow-md transition-all duration-200", className)} {...props}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 text-lg font-semibold">
          {Icon && <Icon className={cn("w-4 h-4", iconColor)} />}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs mt-1">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
})
ChartCard.displayName = "ChartCard"

export { ChartCard }
