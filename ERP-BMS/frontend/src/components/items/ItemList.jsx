import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

const ItemList = ({ items, onEdit, onDelete, deletingId }) => {
  return (
    <div className="overflow-x-auto bg-card rounded-lg border border-border">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan="6"
                className="px-6 py-8 text-center text-muted-foreground"
              >
                No items found
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item._id} className="hover:bg-accent transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-foreground">{item.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                  {item.description || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-foreground">
                  ${Number(item.sellingPrice || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={cn(
                      "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                      item.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                    onClick={() => onEdit(item)}
                      variant="ghost"
                      size="sm"
                      className="hover:text-primary"
                  >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                    onClick={() => onDelete(item)}
                      variant="ghost"
                      size="sm"
                      className="hover:text-destructive"
                    disabled={deletingId === item._id}
                  >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deletingId === item._id ? 'Deleting...' : 'Delete'}
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

export default ItemList
