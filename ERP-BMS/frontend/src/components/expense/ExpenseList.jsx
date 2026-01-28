import { Pencil, Trash2, Check, X, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

const statusClasses = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
}

const ExpenseList = ({ expenses, onEdit, onDelete, onStatusChange, deletingId, userRole }) => {
  const isAdmin = userRole === 'admin'

  return (
    <div className="overflow-x-auto bg-card rounded-lg border border-border">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {expenses.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">
                No expenses found
              </td>
            </tr>
          ) : (
            expenses.map((expense) => (
              <tr key={expense._id} className="hover:bg-accent transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{expense.title || expense.description || '—'}</span>
                    {expense.notes && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{expense.notes}</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs font-semibold uppercase tracking-wider">
                    {expense.category || 'other'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                  {expense.date ? format(new Date(expense.date), 'MMM dd, yyyy') : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground">
                  ${Number(expense.amount || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={cn(
                      "px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full",
                      statusClasses[expense.status] || 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {expense.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Status Actions for Admins */}
                    {isAdmin && onStatusChange && (
                      <div className="flex items-center gap-1 mr-2 pr-2 border-r border-border">
                        {expense.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => onStatusChange(expense._id, 'approved')}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => onStatusChange(expense._id, 'rejected')}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {expense.status === 'approved' && (
                          <>
                            <Button
                              onClick={() => onStatusChange(expense._id, 'paid')}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Mark as Paid"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => onStatusChange(expense._id, 'rejected')}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={() => onEdit(expense)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-primary"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => onDelete(expense)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      disabled={deletingId === expense._id}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
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

export default ExpenseList
