import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Pencil, Trash2, Eye, FileText, CreditCard, Mail, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { TableCard } from '../ui/table-card'
import { Card, CardContent } from '../ui/card'
import { cn } from '../../lib/utils'

const statusClasses = {
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  draft: 'bg-slate-50 text-slate-700 ring-slate-600/20',
  sent: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  partially_paid: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  cancelled: 'bg-gray-50 text-gray-500 ring-gray-400/20',
}

const InvoiceList = ({ invoices, onDelete, deletingId, onRecordPayment, onMarkAsSent, markingAsSentId }) => {
  if (invoices.length === 0) {
    return (
      <div className="px-6 py-20 text-center text-muted-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 opacity-20" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">No invoices found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {invoices.map((invoice) => (
              <tr
                key={invoice._id}
                className={cn(
                  "group hover:bg-accent transition-all duration-200",
                  invoice.status === 'draft' && 'bg-muted/20'
                )}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-foreground italic">#{invoice.invoiceNumber}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                      {invoice.customerDetails?.name || invoice.customer?.fullName || 'Untitled'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {invoice.customer?.email || 'No email'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'MMM dd, yyyy') : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-foreground">
                    ${Number(invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold uppercase ring-1 ring-inset",
                    statusClasses[invoice.status] || 'bg-muted text-muted-foreground ring-border'
                  )}>
                    {invoice.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <InvoiceActions
                      invoice={invoice}
                      onDelete={onDelete}
                      onRecordPayment={onRecordPayment}
                      onMarkAsSent={onMarkAsSent}
                      deletingId={deletingId}
                      markingAsSentId={markingAsSentId}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-muted/20">
        {invoices.map((invoice) => (
          <Card
            key={invoice._id}
            className="active:scale-[0.98] transition-all"
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-primary italic">#{invoice.invoiceNumber}</span>
                  <span className="text-base font-bold text-foreground mt-0.5 line-clamp-1">
                    {invoice.customerDetails?.name || invoice.customer?.fullName || 'Untitled'}
                  </span>
                </div>
                <span className={cn(
                  "inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold uppercase ring-1 ring-inset",
                  statusClasses[invoice.status]
                )}>
                  {invoice.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <CreditCard className="w-3 h-3" />
                    <span>${Number(invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Due {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd') : '—'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <InvoiceActions
                    invoice={invoice}
                    onDelete={onDelete}
                    onRecordPayment={onRecordPayment}
                    onMarkAsSent={onMarkAsSent}
                    deletingId={deletingId}
                    markingAsSentId={markingAsSentId}
                    isMobile
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Sub-component for cleaner action logic
const InvoiceActions = ({ invoice, onDelete, onRecordPayment, onMarkAsSent, deletingId, markingAsSentId, isMobile }) => {
  const iconSize = isMobile ? "w-5 h-5" : "w-4 h-4";

  return (
    <div className="flex items-center gap-1">
      {invoice.status === 'draft' && (
        <Button
          onClick={() => onMarkAsSent(invoice)}
          disabled={markingAsSentId === invoice._id}
          variant={isMobile ? "outline" : "ghost"}
          size={isMobile ? "default" : "icon"}
          title="Send Invoice"
        >
          {markingAsSentId === invoice._id ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : (
            <Mail className={iconSize} />
          )}
        </Button>
      )}
      {['sent', 'partially_paid', 'overdue'].includes(invoice.status) && (
        <Button
          onClick={() => onRecordPayment(invoice)}
          variant={isMobile ? "outline" : "ghost"}
          size={isMobile ? "default" : "icon"}
          title="Record Payment"
          className="hover:text-emerald-600"
        >
          <CreditCard className={iconSize} />
        </Button>
      )}
      <Button
        asChild
        variant={isMobile ? "outline" : "ghost"}
        size={isMobile ? "default" : "icon"}
        title="View Details"
      >
        <Link to={`/invoices/${invoice._id}`}>
          <Eye className={iconSize} />
        </Link>
      </Button>
      {invoice.status === 'draft' && (
        <>
          <Button
            asChild
            variant={isMobile ? "outline" : "ghost"}
            size={isMobile ? "default" : "icon"}
            title="Edit"
            className="hover:text-amber-600"
          >
            <Link to={`/invoices/${invoice._id}/edit`}>
              <Pencil className={iconSize} />
            </Link>
          </Button>
          <Button
            onClick={() => onDelete(invoice)}
            disabled={deletingId === invoice._id}
            variant={isMobile ? "outline" : "ghost"}
            size={isMobile ? "default" : "icon"}
            title="Delete"
            className="hover:text-destructive"
          >
            {deletingId === invoice._id ? (
              <Loader2 className={cn(iconSize, "animate-spin")} />
            ) : (
              <Trash2 className={iconSize} />
            )}
          </Button>
        </>
      )}
    </div>
  )
}

export default InvoiceList
