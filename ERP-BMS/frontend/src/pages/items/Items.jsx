import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from 'react-query'
import {
  Download,
  Filter,
  MoreVertical,
  Plus,
  Search,
  RefreshCw,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import ConfirmDialog from '../../components/common/ConfirmDialog'
import ItemList from '../../components/items/ItemList'
import { useDebounce } from '../../hooks/useDebounce'
import { useCompanyId } from '../../hooks/useCompanyId'
import { validateCompanyData } from '../../utils/dataValidation'
import { itemService } from '../../services/api/itemService'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'

const Items = () => {
  // ✅ FIX: Get companyId for query keys
  const companyId = useCompanyId()

  const location = useLocation()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (location.state?.openCreateForm) {
      navigate('/items/create', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const debouncedSearch = useDebounce(searchTerm, 400)
  const queryClient = useQueryClient()
  const limit = 5

  // ✅ FIX: Include companyId in query key
  const {
    data,
    isLoading,
    isError,
  } = useQuery(
    ['items', companyId, debouncedSearch, typeFilter, page],
    () =>
      itemService.getAll({
        search: debouncedSearch || undefined,
        type: typeFilter || undefined,
        page,
        limit,
      }),
    {
      keepPreviousData: true,
      enabled: !!companyId // ✅ FIX: Don't fetch if no companyId
    }
  )

  const rawItems = data?.data || []
  
  // ✅ FIX: Validate company data before rendering
  const { filteredRecords: items, invalidCount } = validateCompanyData(rawItems, companyId, 'company')
  if (invalidCount > 0) {
    console.error(`[Items] ${invalidCount} items with wrong companyId detected and filtered out`)
    queryClient.invalidateQueries(['items', companyId])
  }
  
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeFilter])

  const deleteItem = useMutation(itemService.delete, {
    onSuccess: () => {
      toast.success('Item deleted')
      queryClient.invalidateQueries({ queryKey: ['items', companyId] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to delete item')
    },
    onSettled: () => {
      setItemToDelete(null)
    },
  })

  const deletingId =
    deleteItem.isLoading && deleteItem.variables ? deleteItem.variables : null

  const handleEdit = (item) => {
    navigate(`/items/${item._id}/edit`)
  }

  const handleDeleteRequest = (item) => {
    setItemToDelete(item)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!itemToDelete?._id) return
    deleteItem.mutate(itemToDelete._id)
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['items', companyId],
      refetchActive: true,
      refetchInactive: true,
    })
    toast.success('List refreshed')
    setIsMenuOpen(false)
  }

  const handleExportCSV = () => {
    if (!items.length) {
      toast.error('No items to export')
      return
    }
    const headers = ['Name', 'Type', 'Description', 'Selling Price', 'Status']
    const rows = items.map((item) => [
      `"${item.name || ''}"`,
      `"${item.type || ''}"`,
      `"${item.description || ''}"`,
      item.sellingPrice ?? '',
      item.isActive ? 'Active' : 'Inactive',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `items_${new Date().toISOString().split('T')[0]}.csv`
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Items</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your products and services inventory</p>
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
          <Button onClick={() => navigate('/items/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
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
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 bg-muted p-1.5 rounded-lg border flex-1 sm:flex-none">
                <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-sm font-medium text-foreground outline-none px-2 py-1 cursor-pointer flex-1"
              >
                  <option value="">All Types</option>
                  <option value="product">Product</option>
                  <option value="service">Service</option>
              </select>
            </div>

            {(searchTerm || typeFilter) && (
                <Button
                onClick={() => {
                  setSearchTerm('')
                  setTypeFilter('')
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
          Unable to load items. Please try again.
        </div>
      ) : (
            <>
          <ItemList
            items={items}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            deletingId={deletingId}
          />
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
              Page {pagination.page || 1} of {pagination.pages || 1} ·{' '}
                  <span className="font-semibold text-foreground">{pagination.total || items.length}</span> items
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
          setItemToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${itemToDelete?.name || ''}"? This action cannot be undone.`}
        confirmText="Delete"
        isDanger
      />
    </div>
  )
}

export default Items
