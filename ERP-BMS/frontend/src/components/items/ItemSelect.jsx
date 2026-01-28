import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from 'react-query'
import { Plus, Search, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

import ItemForm from './ItemForm'
import { itemService } from '../../services/api/itemService'

const ItemSelect = ({
  value,
  onChange,
  items = [],
  placeholder = 'Select or add an item',
  disabled = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isItemFormOpen, setIsItemFormOpen] = useState(false)
  const [localItems, setLocalItems] = useState([])
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

  const upsertItemIntoCache = (created) => {
    if (!created?._id) return

    const queries = queryClient.getQueryCache().findAll()
    for (const q of queries) {
      const key = q.queryKey
      const isItemsKey =
        key === 'items' || (Array.isArray(key) && key.length > 0 && key[0] === 'items')
      if (!isItemsKey) continue

      queryClient.setQueryData(key, (old) => {
        if (!old) return old

        const list = Array.isArray(old) ? old : old?.data
        if (!Array.isArray(list)) return old
        if (list.some((it) => it?._id === created._id)) return old

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

  const mergedItems = useMemo(() => {
    if (!localItems.length) return items
    const byId = new Map()
    for (const it of [...localItems, ...items]) {
      if (it?._id && !byId.has(it._id)) byId.set(it._id, it)
    }
    return Array.from(byId.values())
  }, [items, localItems])

  const selected = useMemo(
    () => mergedItems.find((it) => it._id === value) || null,
    [mergedItems, value]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return mergedItems
    return mergedItems.filter((it) => {
      const name = (it.name || '').toLowerCase()
      const description = (it.description || '').toLowerCase()
      return name.includes(term) || description.includes(term)
    })
  }, [mergedItems, search])

  const createItemMutation = useMutation(itemService.create, {
    onSuccess: async (res) => {
      const created = res?.data?.item || res?.data || res?.item || res

      upsertItemIntoCache(created)
      if (created?._id) {
        setLocalItems((prev) =>
          prev.some((it) => it._id === created._id) ? prev : [created, ...prev]
        )
        onChange(created._id)
      }

      try {
        queryClient.invalidateQueries('items')
      } catch {
        // ignore
      }

      toast.success('Item created')
      setIsItemFormOpen(false)
      setIsOpen(false)
      setSearch('')
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create item')
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

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        className={`input-field flex items-center justify-between ${disabled ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
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
          {selected ? selected.name : placeholder}
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
              className="text-gray-400 hover:text-gray-600"
              aria-label="Clear item"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </span>
      </button>

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
                placeholder="Search items..."
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto overflow-x-hidden divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">No items found</div>
            ) : (
              filtered.map((it) => {
                const isSelected = it._id === value
                return (
                  <button
                    key={it._id}
                    type="button"
                    onClick={() => {
                      onChange(it._id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 overflow-hidden transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-slate-300'}`}
                  >
                    <div className="font-medium truncate">{it.name}</div>
                    {it.sellingPrice !== undefined && it.sellingPrice !== null && (
                      <div className="text-xs text-gray-500 dark:text-slate-500 truncate">Price: ${Number(it.sellingPrice || 0).toLocaleString()}</div>
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsItemFormOpen(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Item
            </button>
          </div>
        </div>,
        document.body
      )}

      {isItemFormOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Add Item</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Create a new item.</p>
                </div>
                <button
                  onClick={() => setIsItemFormOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 overflow-x-auto overflow-y-auto flex-1">
                <ItemForm
                  item={null}
                  onSave={(values) => createItemMutation.mutate(values)}
                  onCancel={() => setIsItemFormOpen(false)}
                  isSaving={createItemMutation.isLoading}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default ItemSelect
