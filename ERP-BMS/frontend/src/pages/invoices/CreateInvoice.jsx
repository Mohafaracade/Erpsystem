import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { invoiceService } from '../../services/api/invoiceService'
import { customerService } from '../../services/api/customerService'
import { itemService } from '../../services/api/itemService'
import { toast } from 'react-hot-toast'
import InvoiceForm from '../../components/invoices/InvoiceForm'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const CreateInvoice = () => {
  const navigate = useNavigate()

  const { data: customers } = useQuery('customers', () => customerService.getAll())
  const { data: items } = useQuery('items', () => itemService.getAll())

  const createMutation = useMutation(
    (data) => invoiceService.create(data),
    {
      onSuccess: () => {
        toast.success('Invoice created successfully')
        navigate('/invoices')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create invoice')
      },
    }
  )

  const handleSubmit = (formData, totals) => {
    // Basic validation logic moved here or kept in form?
    // Let's keep minimal validation here and rely on Form validation visuals + backend
    if (!formData.customer) {
      toast.error('Please select a customer')
      return
    }

    if (!formData.items || formData.items.length === 0) {
      toast.error('Add at least one item')
      return
    }

    const payloadItems = formData.items.map((item) => {
      const base = (item.quantity || 0) * (item.price || 0)
      const lineTax = base * ((item.taxRate || 0) / 100)
      const amount = base + lineTax
      return {
        item: item.itemId,
        quantity: item.quantity,
        rate: item.price,
        tax: item.taxRate || 0,
        amount,
      }
    })

    createMutation.mutate({
      customer: formData.customer,
      invoiceNumber: formData.invoiceNumber?.trim() || undefined,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate,
      terms: formData.terms || '',
      items: payloadItems,
      subTotal: totals.subtotal,
      taxTotal: totals.taxAmount,
      total: totals.total,
      status: formData.status,
      notes: formData.notes || '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/invoices" className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Invoices
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Create New Invoice</h1>
      </div>

      <InvoiceForm
        customers={customers?.data?.data || customers?.data || []}
        items={items?.data?.data || items?.data || []}
        onSubmit={handleSubmit}
        isSaving={createMutation.isLoading}
        title="Create Invoice"
      />
    </div>
  )
}

export default CreateInvoice

