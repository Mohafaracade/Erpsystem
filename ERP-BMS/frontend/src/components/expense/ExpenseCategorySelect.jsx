import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, X, Tag, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

const formatCategoryLabel = (value) => {
  if (!value) return ''
  if (value.includes('_')) {
    return value
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }
  return value
}

const ExpenseCategorySelect = ({
  value,
  onChange,
  categories = [],
  placeholder = 'Select or add a category',
  disabled = false,
  required = false,
  hasError = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [localCategories, setLocalCategories] = useState([])

  const wrapperRef = useRef(null)

  const mergedCategories = useMemo(() => {
    const combined = [...localCategories, ...categories]
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter(Boolean)

    const seen = new Set()
    const unique = []
    for (const c of combined) {
      const key = c.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(c)
    }
    return unique
  }, [categories, localCategories])

  const selected = useMemo(() => {
    if (!value) return null
    return mergedCategories.find((c) => c === value) || value
  }, [mergedCategories, value])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return mergedCategories
    return mergedCategories.filter((c) => {
      const label = formatCategoryLabel(c).toLowerCase()
      return label.includes(term) || c.toLowerCase().includes(term)
    })
  }, [mergedCategories, search])

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside BOTH the main wrapper AND the portal
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        // We need to check if the click target is inside the dropdown portal
        // Since portal is appended to document.body, we can't easily check via wrapperRef containment
        // But we can check if the target is inside our specific dropdown structure
        const dropdown = document.getElementById('category-dropdown-portal');
        if (dropdown && dropdown.contains(event.target)) {
          return;
        }
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

  const handleCreateCategory = () => {
    const valueTrimmed = newCategory.trim()
    if (!valueTrimmed) {
      toast.error('Please enter a category name')
      return
    }

    const exists = mergedCategories.some(
      (c) => c.toLowerCase() === valueTrimmed.toLowerCase()
    )

    const finalValue = exists
      ? mergedCategories.find((c) => c.toLowerCase() === valueTrimmed.toLowerCase())
      : valueTrimmed

    if (!exists) {
      setLocalCategories((prev) => [finalValue, ...prev])
    }

    onChange(finalValue)
    setIsNewOpen(false)
    setIsOpen(false)
    setSearch('')
    setNewCategory('')
  }

  // Custom button styling to match inputs
  const getButtonClass = () => {
    const base = "w-full flex items-center justify-between pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border rounded-xl outline-none transition-all duration-200 text-left"
    if (hasError) {
      return `${base} border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10`
    }
    return `${base} border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10`
  }

  return (
    <div ref={wrapperRef} className="relative group">
      <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors z-10" />
      <button
        type="button"
        className={`${getButtonClass()} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (disabled) return
          setIsOpen((p) => !p)
          setSearch('')
        }}
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${selected ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400'}`}>
          {selected ? formatCategoryLabel(selected) : placeholder}
        </span>
        <span className="flex items-center gap-2 flex-shrink-0">
          {value && !disabled && (
            <div
              role="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange('')
                setIsOpen(false)
                setSearch('')
              }}
              className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Clear category"
            >
              <X className="w-3.5 h-3.5" />
            </div>
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

      {/* Dropdown Portal to avoid z-index issues */}
      {isOpen && createPortal(
        <div
          id="category-dropdown-portal"
          className="fixed z-[9999] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden ring-1 ring-black/5"
          style={{
            top: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().bottom + 8 : 0,
            left: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().left : 0,
            width: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().width : 300,
            maxHeight: '320px'
          }}
        >
          <div className="p-3 border-b border-gray-50 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 text-gray-900 dark:text-slate-100 placeholder-gray-400"
                placeholder="Search categories..."
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
            <div className="p-1.5 border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20">
              <button
                type="button"
                onClick={() => {
                  if (search.trim()) {
                    const val = search.trim();
                    setLocalCategories(prev => [val, ...prev]);
                    onChange(val);
                    setIsOpen(false);
                    setSearch('');
                    toast.success(`Category "${val}" added`);
                  } else {
                    setIsNewOpen(true);
                    setNewCategory('');
                    setIsOpen(false);
                  }
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 font-bold flex items-center gap-2 transition-colors border border-dashed border-primary-200 dark:border-primary-800/50"
              >
                <Plus className="w-4 h-4" />
                <span>{search.trim() ? `+New Category: "${search.trim()}"` : '+New Category'}</span>
              </button>
            </div>

            <div className="p-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center flex flex-col items-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 mb-2">
                    <Tag className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {search.trim() ? 'No matching categories' : 'No categories available'}
                  </p>
                </div>
              ) : (
                filtered.map((c) => {
                  const isSelected = c === value
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onChange(c)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      {formatCategoryLabel(c)}
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Bottom button removed as it's now at the top for faster access */}
        </div>,
        document.body
      )}

      {isNewOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Add Category</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Create a new expense category</p>
                </div>
                <button
                  onClick={() => setIsNewOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Category Name</label>
                  <div className="relative group/input">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-primary-500 transition-colors" />
                    <input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                      placeholder="e.g. Fuel, Office Supplies"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewOpen(false)}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all active:scale-95"
                  >
                    Create Category
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default ExpenseCategorySelect
