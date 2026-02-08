import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from 'react-query'
import {
  Download,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

import ConfirmDialog from '../../components/common/ConfirmDialog'
import ReceiptList from '../../components/receipts/ReceiptList'
import { useDebounce } from '../../hooks/useDebounce'
import { useCompanyId } from '../../hooks/useCompanyId'
import { validateCompanyData } from '../../utils/dataValidation'
import { receiptService } from '../../services/api/receiptService'
import GlobalDateRangePicker from '../../components/common/GlobalDateRangePicker'
import { getPresetRange } from '../../utils/datePresets'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'

const Receipts = () => {
  // ✅ FIX: Get companyId for query keys
  const companyId = useCompanyId()

  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState(() => getPresetRange('thisMonth'))
  const navigate = useNavigate()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [receiptToDelete, setReceiptToDelete] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const debouncedSearch = useDebounce(searchTerm, 400)
  const queryClient = useQueryClient()
  const limit = 5

  // ✅ FIX: Include companyId in query key
  const { data, isLoading, isError } = useQuery(
    ['receipts', companyId, debouncedSearch, page, dateRange.startDate, dateRange.endDate],
    () =>
      receiptService.getAll({
        search: debouncedSearch || undefined,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        page,
        limit,
      }),
    { 
      keepPreviousData: true,
      enabled: !!companyId // ✅ FIX: Don't fetch if no companyId
    }
  )

  const rawReceipts = data?.data || []
  
  // ✅ FIX: Validate company data before rendering
  const { filteredRecords: receipts, invalidCount } = validateCompanyData(rawReceipts, companyId, 'company')
  if (invalidCount > 0) {
    console.error(`[Receipts] ${invalidCount} receipts with wrong companyId detected and filtered out`)
    queryClient.invalidateQueries(['receipts', companyId])
  }
  
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const deleteReceipt = useMutation(receiptService.delete, {
    onSuccess: () => {
      toast.success('Receipt deleted')
      queryClient.invalidateQueries({ queryKey: ['receipts', companyId] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to delete receipt')
    },
    onSettled: () => {
      setReceiptToDelete(null)
    },
  })

  const deletingId =
    deleteReceipt.isLoading && deleteReceipt.variables
      ? deleteReceipt.variables
      : null

  const handleEdit = (receipt) => {
    navigate(`/sales/${receipt._id}/edit`)
  }

  const handleDeleteRequest = (receipt) => {
    setReceiptToDelete(receipt)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!receiptToDelete?._id) return
    deleteReceipt.mutate(receiptToDelete._id)
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['receipts'],
      refetchActive: true,
      refetchInactive: true,
    })
    toast.success('List refreshed')
    setIsMenuOpen(false)
  }

  const handleExportCSV = () => {
    if (!receipts.length) {
      toast.error('No receipts to export')
      return
    }
    const headers = ['Receipt #', 'Customer', 'Date', 'Total']
    const rows = receipts.map((r) => [
      `"${r.receiptNumber || r.salesReceiptNumber || ''}"`,
      `"${r.customerDetails?.name || r.customer?.fullName || r.customer?.name || ''}"`,
      r.receiptDate
        ? new Date(r.receiptDate).toISOString().split('T')[0]
        : '',
      r.total ?? r.amount ?? '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `receipts_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV export started')
    setIsMenuOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const getPageNumbers = () => {
    const total = pagination.pages || 1
    const current = pagination.page || 1
    const windowSize = 5
    const start = Math.max(1, current - Math.floor(windowSize / 2))
    const end = Math.min(total, start + windowSize - 1)
    const pages = []
    for (let i = start; i <= end; i += 1) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage sales receipts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={menuRef}>
            <Button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              variant="outline"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Actions</span>
            </Button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-xl border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="py-2">
                  <button
                    className="flex w-full items-center space-x-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    <span>Refresh List</span>
                  </button>
                  <div className="border-t border-border my-1" />
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Data Management
                  </div>
                  <button
                    className="flex w-full items-center space-x-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    onClick={handleExportCSV}
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <GlobalDateRangePicker
            value={dateRange}
            onChange={(range) => {
              setDateRange(range)
              setPage(1)
            }}
          />
          <Button asChild>
            <Link to="/sales/create">
              <Plus className="w-4 h-4 mr-2" />
            Create Receipt
          </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative w-full md:max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : isError ? (
            <div className="p-6 text-center text-destructive bg-destructive/10 rounded-lg">
              Unable to load receipts. Please try again.
            </div>
      ) : (
            <>
          <ReceiptList
            receipts={receipts}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            deletingId={deletingId}
          />
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page || 1} of {pagination.pages || 1} ·{' '}
                  <span className="font-semibold text-foreground">{pagination.total || receipts.length}</span> receipts
            </div>
            <div className="flex items-center space-x-1">
                  <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                    variant="outline"
                    size="sm"
              >
                Previous
                  </Button>
              {getPageNumbers().map((num) => (
                    <Button
                  key={num}
                  onClick={() => setPage(num)}
                      variant={num === pagination.page ? "default" : "outline"}
                      size="sm"
                      className="w-9"
                >
                  {num}
                    </Button>
              ))}
                  <Button
                onClick={() =>
                  setPage((p) =>
                    pagination.page < pagination.pages ? p + 1 : pagination.pages
                  )
                }
                disabled={!pagination.pages || pagination.page >= pagination.pages}
                    variant="outline"
                    size="sm"
              >
                Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setReceiptToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Receipt"
        message={`Are you sure you want to delete receipt "${receiptToDelete?.receiptNumber || receiptToDelete?.salesReceiptNumber || ''}"? This action cannot be undone.`}
        confirmText="Delete"
        isDanger
      />
    </div>
  )
}

export default Receipts
