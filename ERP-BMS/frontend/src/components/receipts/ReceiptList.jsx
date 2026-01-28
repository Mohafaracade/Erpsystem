import { Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '../ui/button'

const ReceiptList = ({ receipts, onEdit, onDelete, deletingId }) => {
  return (
    <div className="overflow-x-auto bg-card rounded-lg border border-border">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receipt #</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {receipts.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="px-6 py-8 text-center text-muted-foreground"
              >
                No receipts found
              </td>
            </tr>
          ) : (
            receipts.map((receipt) => (
              <tr key={receipt._id} className="hover:bg-accent transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                  {receipt.salesReceiptNumber || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-foreground">
                  {receipt.customerDetails?.name ||
                    receipt.customer?.fullName ||
                    receipt.customer?.name ||
                    '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                  {receipt.receiptDate
                    ? format(new Date(receipt.receiptDate), 'MMM dd, yyyy')
                    : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                  ${Number(receipt.total || receipt.amount || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                    onClick={() => onEdit(receipt)}
                      variant="ghost"
                      size="sm"
                      className="hover:text-primary"
                  >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                    onClick={() => onDelete(receipt)}
                      variant="ghost"
                      size="sm"
                      className="hover:text-destructive"
                    disabled={deletingId === receipt._id}
                  >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deletingId === receipt._id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default ReceiptList
