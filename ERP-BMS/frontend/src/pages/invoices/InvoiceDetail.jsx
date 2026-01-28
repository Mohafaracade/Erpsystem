import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useEffect, useRef, useState } from 'react'
import { invoiceService } from '../../services/api/invoiceService'
import { ArrowLeft, Edit, Trash2, Download, Printer, MoreVertical, CreditCard, Info, Send } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format, isValid } from 'date-fns'
import RecordPaymentModal from '../../components/invoices/RecordPaymentModal'

const InvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: invoice, isLoading } = useQuery(
    ['invoice', id],
    () => invoiceService.getById(id),
    { refetchOnWindowFocus: false }
  )
  const [isDownloading, setIsDownloading] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const actionsRef = useRef(null)

  const inv = invoice?.data?.data || invoice?.data || invoice

  const deleteMutation = useMutation(
    () => invoiceService.delete(id),
    {
      onSuccess: () => {
        toast.success('Invoice deleted successfully')
        queryClient.invalidateQueries('invoices')
        navigate('/invoices')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete invoice')
      },
    }
  )

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate()
    }
  }

  const recordPaymentMutation = useMutation(
    (paymentData) => invoiceService.recordPayment(id, paymentData),
    {
      onSuccess: () => {
        toast.success('Payment recorded successfully')
        setIsPaymentModalOpen(false)
        queryClient.invalidateQueries(['invoice', id])
        queryClient.invalidateQueries('invoices')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to record payment')
      },
    }
  )

  const markAsSentMutation = useMutation(
    () => invoiceService.markAsSent(id),
    {
      onMutate: async () => {
        await queryClient.cancelQueries(['invoice', id])
        const previousInvoice = queryClient.getQueryData(['invoice', id])

        if (previousInvoice?.data) {
          queryClient.setQueryData(['invoice', id], {
            ...previousInvoice,
            data: {
              ...previousInvoice.data,
              status: 'sent',
              sentDate: new Date().toISOString()
            }
          })
        }

        return { previousInvoice }
      },
      onSuccess: () => {
        toast.success('Invoice sent. You can now record payments.')
        queryClient.invalidateQueries(['invoice', id])
        queryClient.invalidateQueries('invoices')
      },
      onError: (error, variables, context) => {
        toast.error(error.response?.data?.message || 'Failed to send invoice')
        if (context?.previousInvoice) {
          queryClient.setQueryData(['invoice', id], context.previousInvoice)
        }
      },
    }
  )

  const handlePrint = () => {
    window.print()
  }

  useEffect(() => {
    if (!isActionsOpen) return

    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setIsActionsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActionsOpen])

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true)
      const blob = await invoiceService.generatePDF(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${inv?.invoiceNumber || id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!inv) {
    return <div>Invoice not found</div>
  }

  const safeFormat = (value, fmt = 'MMM dd, yyyy') => {
    const d = value ? new Date(value) : null
    return d && isValid(d) ? format(d, fmt) : '—'
  }

  const customerName =
    inv.customer?.fullName || inv.customer?.name || inv.customerDetails?.name || '—'
  const customerEmail = inv.customer?.email || inv.customerDetails?.email
  const customerAddress = inv.customer?.address || inv.customerDetails?.address

  const statusClasses = {
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    overdue: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
    sent: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    partially_paid: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link to="/invoices" className="flex items-center text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Invoices
        </Link>
        <div className="flex items-center gap-3">
          {inv.status === 'draft' && (
            <button
              onClick={() => markAsSentMutation.mutate()}
              disabled={markAsSentMutation.isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm shadow-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <Send className={`w-4 h-4 ${markAsSentMutation.isLoading ? 'animate-pulse' : ''}`} />
              <span>{markAsSentMutation.isLoading ? 'Sending...' : 'Send Invoice'}</span>
            </button>
          )}

          {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              title="Use this to record money already received from the customer."
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          <div ref={actionsRef} className="relative">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-gray-700 dark:text-slate-300 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              aria-haspopup="menu"
              aria-expanded={isActionsOpen}
              onClick={() => setIsActionsOpen((p) => !p)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsActionsOpen((p) => !p)
                }
              }}
            >
              <MoreVertical className="w-5 h-5" />
              <span className="sr-only">Invoice actions</span>
            </button>

            <div
              role="menu"
              aria-label="Invoice actions"
              className={`absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5 transition duration-150 ease-out z-50 ${isActionsOpen
                ? 'opacity-100 scale-100'
                : 'pointer-events-none opacity-0 scale-95'
                }`}
            >
              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                  onClick={() => {
                    setIsActionsOpen(false)
                    handlePrint()
                  }}
                >
                  <Printer className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                  Print
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors focus:outline-none disabled:opacity-60"
                  onClick={() => {
                    setIsActionsOpen(false)
                    handleDownloadPDF()
                  }}
                  disabled={isDownloading}
                >
                  <Download className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                  {isDownloading ? 'Downloading...' : 'Download PDF'}
                </button>

                {inv.status === 'draft' && (
                  <Link
                    to={`/invoices/${id}/edit`}
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                    onClick={() => setIsActionsOpen(false)}
                  >
                    <Edit className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                    Edit
                  </Link>
                )}

                <div className="my-1 border-t border-gray-100 dark:border-slate-800" />

                {inv.status === 'draft' && (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors focus:outline-none"
                    onClick={() => {
                      setIsActionsOpen(false)
                      handleDelete()
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-500" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {['draft', 'sent', 'partially_paid', 'overdue'].includes(inv.status) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl no-print">
          <Info className="w-4 h-4 text-blue-500" />
          <p className="text-sm text-blue-700 dark:text-blue-400 transition-all duration-300">
            {inv.status === 'draft' ? (
              <>This invoice is a draft. Click <span className="font-bold cursor-pointer underline decoration-dotted" onClick={() => markAsSentMutation.mutate()}>'Send Invoice'</span> above to finalize it and enable payments.</>
            ) : (
              <>Customer has paid? Click <span className="font-bold cursor-pointer underline decoration-dotted" onClick={() => setIsPaymentModalOpen(true)}>'Record Payment'</span> to apply the payment and close this invoice.</>
            )}
          </p>
        </div>
      )}

      <div className="card p-0 overflow-hidden shadow-sm border border-gray-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="p-8 border-b border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-950/20">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">
                Invoice #{inv.invoiceNumber}
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Created: {safeFormat(inv.createdAt)}
                {inv.sentDate && (
                  <span className="ml-4 pl-4 border-l border-gray-200 dark:border-slate-800">
                    Sent: {safeFormat(inv.sentDate)}
                  </span>
                )}
              </p>
            </div>
            <span
              className={`px-4 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider ${statusClasses[inv.status] || 'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-400/20'
                }`}
            >
              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1).replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-b border-gray-200 dark:border-slate-800">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Bill From
            </h3>
            <p className="text-gray-900 dark:text-slate-100 font-bold">Your Company</p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">123 Business St</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">City, State 12345</p>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Bill To
            </h3>
            <p className="text-gray-900 dark:text-slate-100 font-bold">{customerName}</p>
            {customerEmail && <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{customerEmail}</p>}
            {customerAddress && <p className="text-sm text-gray-600 dark:text-slate-400">{customerAddress}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-8 border-b border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-950/10">
          <div className="flex justify-between rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm">
            <span className="text-sm font-medium text-gray-500 dark:text-slate-500">Invoice Date</span>
            <span className="text-sm font-bold text-gray-900 dark:text-slate-200">{safeFormat(inv.invoiceDate)}</span>
          </div>
          <div className="flex justify-between rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm">
            <span className="text-sm font-medium text-gray-500 dark:text-slate-500">Due Date</span>
            <span className="text-sm font-bold text-gray-900 dark:text-slate-200">{safeFormat(inv.dueDate)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20">
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Item</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Quantity</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Price</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {inv.items?.map((item, index) => {
                const qty = item.quantity || 0
                const rate = item.rate || item.price || item.itemDetails?.sellingPrice || 0
                const amount = item.amount ?? qty * rate
                const name = item.name || item.itemDetails?.name || 'Item'
                return (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-850 transition-colors">
                    <td className="px-8 py-5 text-sm font-medium text-gray-800 dark:text-slate-200">{name}</td>
                    <td className="px-8 py-5 text-sm text-gray-600 dark:text-slate-400">{qty}</td>
                    <td className="px-8 py-5 text-sm text-gray-600 dark:text-slate-400">${Number(rate).toLocaleString()}</td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-900 dark:text-slate-100 text-right">
                      ${Number(amount).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 bg-gray-50/30 dark:bg-slate-950/10 border-t border-gray-100 dark:border-slate-800">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-500 dark:text-slate-500">
                {inv.status === 'sent' && "Awaiting customer payment. Use 'Record Payment' when funds are received."}
                {inv.status === 'partially_paid' && "Partial payment recorded. Remaining balance can be settled using 'Record Payment'."}
                {inv.status === 'paid' && "This invoice has been fully paid and settled."}
                {inv.status === 'cancelled' && "This invoice has been cancelled."}
                {inv.status === 'draft' && "Draft invoice — send to enable payments."}
                {inv.status === 'overdue' && "Invoice is past its due date. Follow up with customer or record payment."}
              </p>
            </div>

            {/* Payment History Empty State */}
            {(!inv.payments || inv.payments.length === 0) && inv.status !== 'draft' && (
              <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/50">
                <CreditCard className="w-6 h-6 text-gray-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-medium text-gray-400 dark:text-slate-600">No payments recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-gray-50/60 dark:bg-slate-950/30 border-t border-gray-200 dark:border-slate-800">
          <div className="flex justify-end">
            <div className="w-full sm:w-80 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-slate-400 font-medium">Subtotal</span>
                <span className="font-bold text-gray-900 dark:text-slate-200">${Number(inv.subTotal ?? inv.subtotal ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-slate-400 font-medium">Tax</span>
                <span className="font-bold text-gray-900 dark:text-slate-200">${Number(inv.taxTotal ?? inv.taxAmount ?? 0).toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-black text-primary-600 dark:text-primary-400">${Number(inv.total ?? inv.totalAmount ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={inv}
        isSubmitting={recordPaymentMutation.isLoading}
        onConfirm={(data) => recordPaymentMutation.mutate(data)}
      />
    </div>
  )
}

export default InvoiceDetail

