import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from 'react-query'
import {
  Download,
  FileSpreadsheet,
  Filter,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import ConfirmDialog from '../../components/common/ConfirmDialog'
import CustomerList from '../../components/customers/CustomerList'
import { useDebounce } from '../../hooks/useDebounce'
import { customerService } from '../../services/api/customerService'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'

const Customers = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [page, setPage] = useState(1)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (location.state?.openCreateForm) {
      navigate('/customers/create', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const debouncedSearch = useDebounce(searchTerm, 400)
  const queryClient = useQueryClient()
  const limit = 5

  const {
    data,
    isLoading,
    isError,
  } = useQuery(
    ['customers', debouncedSearch, customerType, page],
    () =>
      customerService.getAll({
        search: debouncedSearch || undefined,
        customerType: customerType || undefined,
        page,
        limit,
      }),
    { keepPreviousData: true }
  )

  const customers = data?.data || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, customerType])

  const deleteCustomer = useMutation(customerService.delete, {
    onSuccess: () => {
      toast.success('Customer deleted')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to delete customer')
    },
    onSettled: () => {
      setCustomerToDelete(null)
    },
  })

  const deletingId =
    deleteCustomer.isLoading && deleteCustomer.variables
      ? deleteCustomer.variables
      : null

  const handleEdit = (customer) => {
    navigate(`/customers/${customer._id}/edit`)
  }

  const handleDeleteRequest = (customer) => {
    setCustomerToDelete(customer)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!customerToDelete?._id) return
    deleteCustomer.mutate(customerToDelete._id)
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['customers'],
      refetchActive: true,
      refetchInactive: true,
    })
    toast.success('List refreshed')
    setIsMenuOpen(false)
  }

  const handleExportCSV = () => {
    const rows = customers.map((c) => [
      `"${c.fullName || c.name || ''}"`,
      `"${c.customerType || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
    ])
    const headers = ['Name', 'Type', 'Phone', 'Email', 'Address']
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your customer relationships and data</p>
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
          <Button onClick={() => navigate('/customers/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
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
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 bg-muted p-1.5 rounded-lg border flex-1 sm:flex-none">
                <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="bg-transparent text-sm font-medium text-foreground outline-none px-2 py-1 cursor-pointer flex-1"
                >
                  <option value="">All Types</option>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
              </div>

              {(searchTerm || customerType) && (
                <Button
                  onClick={() => {
                    setSearchTerm('')
                    setCustomerType('')
                    setPage(1)
                  }}
                  variant="ghost"
                  size="icon"
                  title="Clear filters"
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
              Unable to load customers. Please try again.
            </div>
          ) : (
            <>
              <CustomerList
                customers={customers}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                deletingId={deletingId}
              />
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page || 1} of {pagination.pages || 1} ·{' '}
                  <span className="font-semibold text-foreground">{pagination.total || customers.length}</span> customers
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
                        pagination.page < pagination.pages
                          ? p + 1
                          : pagination.pages
                      )
                    }
                    disabled={
                      !pagination.pages || pagination.page >= pagination.pages
                    }
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
          setCustomerToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete "${customerToDelete?.fullName || ''}"? This action cannot be undone.`}
        confirmText="Delete"
        isDanger
      />
    </div>
  )
}

export default Customers
