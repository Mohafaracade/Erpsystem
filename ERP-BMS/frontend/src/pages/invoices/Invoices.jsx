import { useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from 'react-query'
import { Link } from 'react-router-dom'
import { invoiceService } from '../../services/api/invoiceService'
import GlobalDateRangePicker from '../../components/common/GlobalDateRangePicker'
import { getPresetRange } from '../../utils/datePresets'
import {
  Filter,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import ConfirmDialog from '../../components/common/ConfirmDialog'
import InvoiceList from '../../components/invoices/InvoiceList'
import RecordPaymentModal from '../../components/invoices/RecordPaymentModal'
import InvoiceAnalyticsHeader from '../../components/invoices/InvoiceAnalyticsHeader'
import { useDebounce } from '../../hooks/useDebounce'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'

const Invoices = () => {
  // Filters and UI State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState(() => getPresetRange('thisMonth'))

  // Modals
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [invoiceForPayment, setInvoiceForPayment] = useState(null)

  const debouncedSearch = useDebounce(searchTerm, 400)
  const queryClient = useQueryClient()
  const limit = 5

  // Fetch Invoices
  const {
    data: invoicesData,
    isLoading: isInvoicesLoading,
    isError,
  } = useQuery(
    ['invoices', debouncedSearch, statusFilter, page, dateRange.startDate, dateRange.endDate],
    () =>
      invoiceService.getAll({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        page,
        limit,
      }),
    { keepPreviousData: true }
  )

  // Fetch Stats for Header
  const { data: statsData, isLoading: isStatsLoading } = useQuery(
    ['invoice-stats', dateRange.startDate, dateRange.endDate],
    () => invoiceService.getStats({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      groupBy: 'day'
    }),
    { staleTime: 5 * 60 * 1000 }
  )

  const stats = statsData?.data || {}
  const invoices = invoicesData?.data || []
  const pagination = invoicesData?.pagination || { page: 1, pages: 1, total: 0 }

  const handleDateSelect = (range) => {
    setDateRange(range)
    setPage(1)
  }

  // Mutations
  const deleteMutation = useMutation(invoiceService.delete, {
    onSuccess: () => {
      toast.success('Invoice deleted')
      queryClient.invalidateQueries('invoices')
      queryClient.invalidateQueries('invoice-stats')
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to delete invoice')
    },
  })

  const recordPaymentMutation = useMutation(
    ({ id, data }) => invoiceService.recordPayment(id, data),
    {
      onSuccess: () => {
        toast.success('Payment recorded successfully')
        setIsPaymentModalOpen(false)
        queryClient.invalidateQueries('invoices')
        queryClient.invalidateQueries('invoice-stats')
        queryClient.invalidateQueries('reports-comprehensive')
      },
      onError: (error) => {
        toast.error(error?.response?.data?.message || 'Failed to record payment')
      },
    }
  )

  const markAsSentMutation = useMutation(
    (id) => invoiceService.markAsSent(id),
    {
      onMutate: async (id) => {
        await queryClient.cancelQueries('invoices')
        const previousInvoices = queryClient.getQueryData('invoices')

        if (previousInvoices?.data) {
          queryClient.setQueryData('invoices', {
            ...previousInvoices,
            data: previousInvoices.data.map(inv =>
              inv._id === id ? { ...inv, status: 'sent' } : inv
            )
          })
        }

        return { previousInvoices }
      },
      onSuccess: () => {
        toast.success('Invoice sent successfully')
        queryClient.invalidateQueries('invoices')
        queryClient.invalidateQueries('invoice-stats')
      },
      onError: (error, id, context) => {
        toast.error(error?.response?.data?.message || 'Failed to send invoice')
        if (context?.previousInvoices) {
          queryClient.setQueryData('invoices', context.previousInvoices)
        }
      },
    }
  )

  // Handlers
  const confirmDelete = () => {
    if (invoiceToDelete?._id) {
      deleteMutation.mutate(invoiceToDelete._id)
      setIsDeleteOpen(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your customer invoices</p>
        </div>

        <div className="flex items-center gap-2">
          <GlobalDateRangePicker
            value={dateRange}
            onChange={handleDateSelect}
          />
        </div>
      </div>

      {/* Analytics Section */}
      <InvoiceAnalyticsHeader stats={stats} loading={isStatsLoading} />

      {/* Main Content Card */}
      <Card className="overflow-hidden">
        {/* Table Toolbar */}
        <CardContent className="p-6 border-b border-border">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by invoice # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 bg-muted p-1.5 rounded-lg border flex-1 sm:flex-none">
                <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-sm font-medium text-foreground outline-none px-2 py-1 cursor-pointer flex-1"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="partially_paid">Partial</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <Button asChild className="flex-1 sm:flex-none">
                  <Link to="/invoices/create">
                    <Plus className="w-4 h-4 mr-2" />
                    New Invoice
                  </Link>
                </Button>

                {(searchTerm || statusFilter !== 'all') && (
                  <Button
                    onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                    variant="ghost"
                    size="icon"
                    title="Clear filters"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        {/* List Content */}
        {isInvoicesLoading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Loading invoices...</p>
          </div>
        ) : (
          <>
            <InvoiceList
              invoices={invoices}
              onDelete={(inv) => { setInvoiceToDelete(inv); setIsDeleteOpen(true); }}
              onRecordPayment={(inv) => { setInvoiceForPayment(inv); setIsPaymentModalOpen(true); }}
              onMarkAsSent={(inv) => markAsSentMutation.mutate(inv._id)}
              deletingId={deleteMutation.isLoading ? deleteMutation.variables : null}
              markingAsSentId={markAsSentMutation.isLoading ? markAsSentMutation.variables : null}
            />

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{invoices.length}</span> of <span className="font-semibold text-foreground">{pagination.total}</span> invoices
              </span>

              <div className="flex items-center gap-1">
                <Button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="ghost"
                  size="icon"
                >
                  <RefreshCw className={`w-4 h-4 ${isInvoicesLoading ? 'animate-spin' : ''}`} />
                </Button>
                <div className="flex gap-1 mx-2">
                  {[...Array(pagination.pages || 0)].map((_, i) => (
                    <Button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      variant={page === i + 1 ? "default" : "ghost"}
                      size="sm"
                      className="w-8 h-8 p-0"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Invoice"
        message={`This will permanently remove invoice #${invoiceToDelete?.invoiceNumber}. This action is IRREVERSIBLE.`}
        confirmText="Confirm Delete"
        isDanger
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={invoiceForPayment}
        isSubmitting={recordPaymentMutation.isLoading}
        onConfirm={(paymentData) => recordPaymentMutation.mutate({ id: invoiceForPayment._id, data: paymentData })}
      />
    </div>
  )
}

export default Invoices
