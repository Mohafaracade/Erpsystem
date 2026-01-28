import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  AlertCircle,
  Package,
  DollarSign,
  FileText,
  Type,
  Calculator,
  Briefcase,
  Box,
  Percent,
  HelpCircle,
  ArrowLeft
} from 'lucide-react'

const defaultFormState = {
  name: '',
  type: 'Goods',
  description: '',
  sellingPrice: '',
  isActive: true,
}

const ItemForm = ({ item, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState(defaultFormState)
  const [touched, setTouched] = useState({})

  // Intelligent Feature: Visual-only Cost Price for Margin Calculation
  const [costPrice, setCostPrice] = useState('')
  const [margin, setMargin] = useState(null)

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        type: item.type || 'Goods',
        description: item.description || '',
        sellingPrice:
          item.sellingPrice !== undefined && item.sellingPrice !== null
            ? item.sellingPrice
            : '',
        isActive: item.isActive !== undefined ? item.isActive : true,
      })
    } else {
      setFormData(defaultFormState)
    }
  }, [item])

  // Intelligent Feature: Auto-calculate margin
  useEffect(() => {
    const sell = parseFloat(formData.sellingPrice)
    const cost = parseFloat(costPrice)
    if (!isNaN(sell) && !isNaN(cost) && sell > 0) {
      const profit = sell - cost
      const marginPercent = (profit / sell) * 100
      setMargin(marginPercent.toFixed(1))
    } else {
      setMargin(null)
    }
  }, [formData.sellingPrice, costPrice])

  // Intelligent Feature: Smart Type Detection
  const handleNameChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, name: value }))

    // Auto-detect type based on keywords if type hasn't been manually changed yet (or just suggest)
    if (!item) { // Only for new items
      const serviceKeywords = ['service', 'consulting', 'design', 'hour', 'labor', 'installation', 'support']
      if (serviceKeywords.some(keyword => value.toLowerCase().includes(keyword))) {
        setFormData(prev => ({ ...prev, type: 'Service' }))
      }
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
    })
  }

  const isValid = (field) => {
    if (field === 'name') return formData.name.trim().length > 0
    if (field === 'sellingPrice') return formData.sellingPrice !== '' && parseFloat(formData.sellingPrice) >= 0
    return true
  }

  const getErrorMessage = (field) => {
    if (field === 'name' && !isValid('name')) {
      return 'Item name is required'
    }
    if (field === 'sellingPrice' && !isValid('sellingPrice')) {
      return 'Please enter a valid price (0 or greater)'
    }
    return ''
  }

  const getInputClass = (field) => {
    const base = "w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border rounded-xl outline-none transition-all duration-200"
    if (touched[field] && !isValid(field)) {
      return `${base} border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10`
    }
    return `${base} border-gray-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-gray-300 dark:hover:border-slate-600`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
      {/* Header Section with intelligent summary */}
      <div className="bg-primary-50/50 dark:bg-slate-800/50 rounded-2xl p-4 border border-primary-100 dark:border-slate-700 flex items-start gap-3">
        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-primary-600">
          {formData.type === 'Goods' ? <Box className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {formData.name || 'New Item'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {formData.type} • {formData.sellingPrice ? `$${formData.sellingPrice}` : 'Price not set'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name Field */}
        <div className="md:col-span-2 space-y-1.5 group">
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            Item Name
          </label>
          <div className="relative">
            <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              onBlur={() => handleBlur('name')}
              className={getInputClass('name')}
              placeholder="e.g. Web Design Service"
              required
              maxLength={200}
              autoFocus
            />
            {touched.name && isValid('name') && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-in fade-in zoom-in" />
            )}
          </div>
          {touched.name && !isValid('name') && (
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{getErrorMessage('name')}</span>
            </div>
          )}
        </div>

        {/* Type Selection */}
        <div className="space-y-1.5 group">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            <span>Type</span>
            <div className="group/tooltip relative">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              <div className="invisible group-hover/tooltip:visible absolute left-0 top-5 z-10 w-56 p-2 bg-gray-900 dark:bg-slate-800 text-white text-[10px] rounded-lg shadow-lg">
                <strong>Goods:</strong> Physical products you sell<br />
                <strong>Service:</strong> Digital products or labor services
              </div>
            </div>
          </label>
          <div className="relative">
            <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={`${getInputClass('type')} appearance-none cursor-pointer`}
              required
            >
              <option value="Goods">Goods (Physical)</option>
              <option value="Service">Service (Digital/Labor)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 rotate-45 mb-0.5"></div>
            </div>
          </div>
        </div>

        {/* Selling Price */}
        <div className="space-y-1.5 group">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            <span>Selling Price</span>
            <div className="group/tooltip relative">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              <div className="invisible group-hover/tooltip:visible absolute left-0 top-5 z-10 w-56 p-2 bg-gray-900 dark:bg-slate-800 text-white text-[10px] rounded-lg shadow-lg">
                Enter the price you charge customers. Use decimal format (e.g., 99.99)
              </div>
            </div>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="number"
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleChange}
              onBlur={() => handleBlur('sellingPrice')}
              className={getInputClass('sellingPrice')}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>
          {touched.sellingPrice && !isValid('sellingPrice') && (
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{getErrorMessage('sellingPrice')}</span>
            </div>
          )}
        </div>

        {/* Intelligent Feature: Margin Calculator */}
        <div className="md:col-span-2 bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Smart Margin Calculator
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 rounded-full">
              Optional • Not Saved
            </span>
          </div>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <label className="absolute -top-2 left-2 px-1 bg-white dark:bg-slate-900 text-[10px] font-medium text-gray-400">
                Cost Price
              </label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 outline-none"
                placeholder="0.00"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            </div>

            <div className="text-gray-300 dark:text-slate-600">→</div>

            <div className={`flex-1 flex items-center gap-3 p-2 rounded-lg border ${margin
              ? parseFloat(margin) < 0
                ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400'
                : 'bg-green-50 border-green-100 text-green-600 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400'
              : 'bg-gray-50 border-gray-100 text-gray-400 dark:bg-slate-800 dark:border-slate-700'
              }`}>
              <Percent className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold opacity-70">
                  Margin
                </span>
                <span className="text-sm font-bold">
                  {margin ? `${margin}%` : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="md:col-span-2 space-y-1.5 group">
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            Description
          </label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className={`${getInputClass('description')} pl-10`}
              placeholder="Describe product details, features, or service terms..."
              maxLength={500}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-[10px] text-gray-400">
              {formData.description?.length || 0}/500
            </span>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="md:col-span-2 flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
          <div>
            <span className="block text-sm font-medium text-gray-900 dark:text-slate-100">
              Item Status
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Inactive items won't appear in invoice form options.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
        <Link
          to="/items"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:transform active:scale-95 shadow-lg shadow-primary-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              item ? 'Save Changes' : 'Create Item'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

export default ItemForm
