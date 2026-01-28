import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from 'react-query'
import { Plus, Search, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

import CustomerForm from './CustomerForm'
import { customerService } from '../../services/api/customerService'

const CustomerSelect = ({
  value,
  onChange,
  customers = [],
  placeholder = 'Select or add a customer',
  disabled = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false)
  const [localCustomers, setLocalCustomers] = useState([])
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  const wrapperRef = useRef(null)
  const dropdownRef = useRef(null)
  const queryClient = useQueryClient()

  const updateDropdownPosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }

  const upsertCustomerIntoCache = (created) => {
    if (!created?._id) return

    const queries = queryClient.getQueryCache().findAll()
    for (const q of queries) {
      const key = q.queryKey
      const isCustomersKey =
        key === 'customers' || (Array.isArray(key) && key.length > 0 && key[0] === 'customers')
      if (!isCustomersKey) continue

      queryClient.setQueryData(key, (old) => {
        if (!old) return old

        const list = Array.isArray(old) ? old : old?.data
        if (!Array.isArray(list)) return old
        if (list.some((c) => c?._id === created._id)) return old

        const nextList = [created, ...list]

        if (Array.isArray(old)) {
          return nextList
        }

        const next = { ...old, data: nextList }
        if (next.pagination && typeof next.pagination.total === 'number') {
          next.pagination = { ...next.pagination, total: next.pagination.total + 1 }
        }
        return next
      })
    }
  }

  const mergedCustomers = useMemo(() => {
    if (!localCustomers.length) return customers
    const byId = new Map()
    for (const c of [...localCustomers, ...customers]) {
      if (c?._id && !byId.has(c._id)) byId.set(c._id, c)
    }
    return Array.from(byId.values())
  }, [customers, localCustomers])

  const selected = useMemo(
    () => mergedCustomers.find((c) => c._id === value) || null,
    [mergedCustomers, value]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return mergedCustomers
    return mergedCustomers.filter((c) => {
      const name = (c.fullName || c.name || '').toLowerCase()
      const phone = (c.phone || '').toLowerCase()
      return name.includes(term) || phone.includes(term)
    })
  }, [mergedCustomers, search])

  const createCustomerMutation = useMutation(customerService.create, {
    onSuccess: async (res) => {
      const created = res?.data?.customer || res?.data || res?.customer || res
      upsertCustomerIntoCache(created)
      if (created?._id) {
        setLocalCustomers((prev) => (prev.some((c) => c._id === created._id) ? prev : [created, ...prev]))
        onChange(created._id)
      }
      try {
        queryClient.invalidateQueries('customers')
      } catch {
        // ignore
      }
      toast.success('Customer created')
      setIsCustomerFormOpen(false)
      setIsOpen(false)
      setSearch('')
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create customer')
    },
  })

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the wrapper AND the dropdown
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!value) return
    const exists = mergedCustomers.some((c) => c._id === value)
    if (!exists && selected) {
      setLocalCustomers((prev) =>
        prev.some((c) => c._id === selected._id) ? prev : [selected, ...prev]
      )
    }
  }, [mergedCustomers, selected, value])

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={`input-field flex items-center justify-between cursor-pointer ${disabled ? 'bg-gray-50 text-gray-600 cursor-not-allowed !cursor-default' : ''}`}
        onClick={() => {
          if (disabled) return
          if (!isOpen) {
            updateDropdownPosition()
          }
          setIsOpen((p) => !p)
          setSearch('')
        }}
        aria-expanded={isOpen}
      >
        <span className={selected ? '' : 'text-gray-400'}>
          {selected ? selected.fullName || selected.name : placeholder}
        </span>
        <span className="flex items-center gap-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange('')
                setIsOpen(false)
                setSearch('')
              }}
              className="p-1 -mr-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Clear customer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </span>
      </div>

      {required && (
        <input
          tabIndex={-1}
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}
          value={value || ''}
          onChange={() => { }}
          required
        />
      )}

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-100 dark:bg-slate-900 dark:border-slate-800"
          style={{
            top: `${dropdownPosition.top + 8}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '400px'
          }}
        >
          <div className="p-2 border-b border-gray-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
                placeholder="Search customers..."
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto overflow-x-hidden divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">No customers found</div>
            ) : (
              filtered.map((c) => {
                const isSelected = c._id === value
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => {
                      onChange(c._id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-slate-300'}`}
                  >
                    <div className="font-medium">{c.fullName || c.name}</div>
                    {c.phone && <div className="text-xs text-gray-500 dark:text-slate-500">{c.phone}</div>}
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCustomerFormOpen(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Customer
            </button>
          </div>
        </div>,
        document.body
      )}

      {isCustomerFormOpen && (
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Add Customer</h2>
                  <p className="text-sm text-gray-500">Create a new customer.</p>
                </div>
                <button
                  onClick={() => setIsCustomerFormOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <CustomerForm
                  customer={null}
                  onSave={(values) => createCustomerMutation.mutate(values)}
                  onCancel={() => setIsCustomerFormOpen(false)}
                  isSaving={createCustomerMutation.isLoading}
                />
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  )
}

export default CustomerSelect
