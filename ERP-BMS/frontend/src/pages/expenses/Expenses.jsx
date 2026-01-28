import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import {
  Download,
  FileSpreadsheet,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { expenseService } from '../../services/api/expenseService'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import ExpenseList from '../../components/expense/ExpenseList'
import { useDebounce } from '../../hooks/useDebounce'
import GlobalDateRangePicker from '../../components/common/GlobalDateRangePicker'
import { getPresetRange } from '../../utils/datePresets'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'

const Expenses = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState(() => getPresetRange('thisMonth'))
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [expenseToReject, setExpenseToReject] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuRef = useRef(null)
  const queryClient = useQueryClient()
  const debouncedSearch = useDebounce(searchTerm, 400)
  const limit = 5

  const { data, isLoading, isError } = useQuery(
    ['expenses', debouncedSearch, page, dateRange.startDate, dateRange.endDate],
    () =>
      expenseService.getAll({
        search: debouncedSearch || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        page,
        limit,
      }),
    { keepPreviousData: true }
  )

  const expenses = data?.data || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

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

  const updateStatus = useMutation(
    ({ id, status }) => expenseService.updateStatus(id, status),
    {
      onSuccess: (res) => {
        toast.success(`Expense ${res.data.status} successfully`)
        queryClient.invalidateQueries({ queryKey: ['expenses'] })
      },
      onError: (error) => {
        toast.error(error?.response?.data?.message || 'Failed to update status')
      },
    }
  )

  const deleteExpense = useMutation(expenseService.delete, {
    onSuccess: () => {
      toast.success('Expense deleted')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to delete expense')
    },
    onSettled: () => {
      setExpenseToDelete(null)
    },
  })

  const deletingId =
    deleteExpense.isLoading && deleteExpense.variables
      ? deleteExpense.variables
      : null

  const handleEdit = (expense) => {
    navigate(`/expenses/${expense._id}/edit`)
  }

  const handleStatusChange = (id, status) => {
    if (status === 'rejected') {
      const expense = expenses.find(e => e._id === id)
      setExpenseToReject(expense)
      setIsRejectOpen(true)
      return
    }
    updateStatus.mutate({ id, status })
  }

  const confirmReject = () => {
    if (!expenseToReject?._id) return
    updateStatus.mutate({ id: expenseToReject._id, status: 'rejected' })
    setIsRejectOpen(false)
    setExpenseToReject(null)
  }

  const handleDeleteRequest = (expense) => {
    setExpenseToDelete(expense)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!expenseToDelete?._id) return
    deleteExpense.mutate(expenseToDelete._id)
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['expenses'],
      refetchActive: true,
      refetchInactive: true,
    })
    toast.success('List refreshed')
    setIsMenuOpen(false)
  }

  const handleExportCSV = () => {
    const headers = ['Title', 'Category', 'Date', 'Amount', 'Status', 'Notes']
    const rows = expenses.map((e) => [
      `"${e.title || e.description || ''}"`,
      `"${e.category || ''}"`,
      `"${e.date ? new Date(e.date).toISOString().split('T')[0] : ''}"`,
      `"${Number(e.amount || 0).toFixed(2)}"`,
      `"${e.status || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV export started')
    setIsMenuOpen(false)
  }

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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage your business expenditures</p>
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
          <Button onClick={() => navigate('/expenses/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center mb-6">
          <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
              type="text"
              placeholder="Search expenses by title or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <GlobalDateRangePicker
              value={dateRange}
              onChange={(range) => { setDateRange(range); setPage(1); }}
            />

            {searchTerm && (
                <Button
                onClick={() => {
                  setSearchTerm('')
                  setPage(1)
                }}
                  variant="ghost"
                  size="icon"
                  title="Clear search"
              >
                  <X className="w-4 h-4" />
                </Button>
            )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : isError ? (
            <div className="p-6 text-center text-destructive bg-destructive/10 rounded-lg">
              Unable to load expenses. Please try again.
            </div>
      ) : (
            <>
          <ExpenseList
            expenses={expenses}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
            deletingId={deletingId}
            userRole={user?.role}
          />

              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page || 1} of {pagination.pages || 1} ·{' '}
                  <span className="font-semibold text-foreground">{pagination.total || expenses.length}</span> expenses
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
          setExpenseToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete expense "${expenseToDelete?.title || expenseToDelete?.description || ''}"? This action cannot be undone.`}
        confirmText="Delete"
        isDanger
      />

      <ConfirmDialog
        isOpen={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false)
          setExpenseToReject(null)
        }}
        onConfirm={confirmReject}
        title="Reject Expense"
        message={`Are you sure you want to reject expense "${expenseToReject?.title || expenseToReject?.description || ''}"?`}
        confirmText="Reject"
        isDanger
      />
    </div>
  )
}

export default Expenses
