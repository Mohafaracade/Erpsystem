import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

const CustomerList = ({ customers, onEdit, onDelete, deletingId }) => {
  return (
    <div className="overflow-x-auto bg-card rounded-lg border border-border">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {customers.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="px-6 py-8 text-center text-muted-foreground"
              >
                No customers found
              </td>
            </tr>
          ) : (
            customers.map((customer) => (
              <tr key={customer._id} className="hover:bg-accent transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">{customer.fullName}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize text-foreground">{customer.customerType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{customer.email || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-foreground">{customer.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      onClick={() => onEdit(customer)}
                      variant="ghost"
                      size="sm"
                      className="hover:text-primary"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => onDelete(customer)}
                      variant="ghost"
                      size="sm"
                      className="hover:text-destructive"
                      disabled={deletingId === customer._id}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deletingId === customer._id ? 'Deleting...' : 'Delete'}
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

export default CustomerList
