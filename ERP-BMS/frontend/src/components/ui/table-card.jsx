import * as React from "react"
import { Card } from "./card"
import { cn } from "../../lib/utils"

const TableCard = React.forwardRef(({ 
  className,
  children,
  ...props 
}, ref) => {
  return (
    <Card ref={ref} className={cn("overflow-hidden", className)} {...props}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </Card>
  )
})
TableCard.displayName = "TableCard"

const TableCardHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 border-b border-border flex items-center justify-between", className)}
    {...props}
  >
    {children}
  </div>
))
TableCardHeader.displayName = "TableCardHeader"

const TableCardTitle = React.forwardRef(({ className, children, icon: Icon, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-3", className)} {...props}>
    {Icon && (
      <div className="p-2 bg-primary/10 rounded-xl text-primary">
        <Icon className="w-5 h-5" />
      </div>
    )}
    <h3 className="text-lg font-bold text-foreground tracking-tight">{children}</h3>
  </div>
))
TableCardTitle.displayName = "TableCardTitle"

export { TableCard, TableCardHeader, TableCardTitle }

