import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { invoiceService } from '../../services/api/invoiceService'
import { customerService } from '../../services/api/customerService'
import { itemService } from '../../services/api/itemService'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import InvoiceForm from '../../components/invoices/InvoiceForm'

const EditInvoice = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: invoice, isLoading } = useQuery(
    ['invoice', id],
    () => invoiceService.getById(id),
    { refetchOnWindowFocus: false }
  )

  const { data: customers } = useQuery('customers', () => customerService.getAll())
  const { data: items } = useQuery('items', () => itemService.getAll())

  const [initialData, setInitialData] = useState(null)

  useEffect(() => {
    const inv = invoice?.data?.data || invoice?.data || invoice
    if (inv) {
      if (inv.status !== 'draft') {
        toast.error('Only draft invoices can be edited. Issued documents are locked.')
        navigate(`/invoices/${id}`)
        return
      }

      const customerId =
        inv.customer?._id ||
        inv.customer ||
        inv.customerDetails?._id ||
        inv.customerDetails?.id ||
        ''

      setInitialData({
        customer: customerId,
        invoiceNumber: inv.invoiceNumber || '',
        invoiceDate: inv.invoiceDate
          ? new Date(inv.invoiceDate).toISOString().split('T')[0]
          : '',
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
        items:
          inv.items?.map((it) => ({
            itemId: it.item?._id || it.item,
            name: it.name || it.itemDetails?.name || '',
            quantity: it.quantity || 1,
            price: it.rate || it.price || it.itemDetails?.sellingPrice || 0,
            taxRate: it.taxRate || it.tax || 0,
          })) || [{ itemId: '', name: '', quantity: 1, price: 0, taxRate: 0 }],
        terms: inv.terms || '',
        notes: inv.notes || '',
      })
    }
  }, [invoice])

  const updateMutation = useMutation(
    (data) => invoiceService.update(id, data),
    {
      onSuccess: async () => {
        toast.success('Invoice updated successfully')
        await queryClient.invalidateQueries(['invoice', id])
        await queryClient.invalidateQueries(['invoices'])
        navigate(`/invoices/${id}`)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update invoice')
      },
    }
  )

  const handleSubmit = (formData, totals) => {
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

    updateMutation.mutate({
      customer: formData.customer,
      invoiceNumber: formData.invoiceNumber || undefined,
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

  if (isLoading || !initialData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to={`/invoices/${id}`} className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Invoice
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100">Edit Invoice</h1>
      </div>

      <InvoiceForm
        initialData={initialData}
        customers={customers?.data?.data || customers?.data || []}
        items={items?.data?.data || items?.data || []}
        onSubmit={handleSubmit}
        isSaving={updateMutation.isLoading}
        title="Edit Invoice"
        backUrl={`/invoices/${id}`}
      />
    </div>
  )
}

export default EditInvoice

