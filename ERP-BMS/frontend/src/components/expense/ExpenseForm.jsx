import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  Calendar,
  Tag,
  CreditCard,
  Store,
  Receipt,
  FileText,
  Save,
  X,
  AlertCircle,
  Check,
  HelpCircle,
  ArrowLeft
} from 'lucide-react'
import ExpenseCategorySelect from './ExpenseCategorySelect'

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
]

const ExpenseForm = ({ expense, onSave, onCancel, isSaving, categories = [], userRole }) => {
  const isAdmin = userRole === 'admin'

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other',
    status: 'pending',
    notes: '',
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  useEffect(() => {
    if (expense?._id) {
      setFormData({
        title: expense.title || expense.description || '',
        amount: expense.amount ?? '',
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
        category: expense.category || 'other',
        status: expense.status || 'pending',
        notes: expense.notes || '',
      })
    } else {
      setFormData({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'other',
        status: 'pending',
        notes: '',
      })
    }
  }, [expense])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required'
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
    }

    setErrors(newErrors)
    setTouched({
      title: true,
      amount: true,
      date: true
    })

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSave({
      title: formData.title?.trim(),
      amount: Number(formData.amount || 0),
      date: formData.date,
      category: (formData.category || 'other').trim() || 'other',
      status: formData.status,
      notes: formData.notes || undefined,
    })
  }

  const getInputClass = (field) => {
    const base = "w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border rounded-xl outline-none transition-all duration-200"
    if (touched[field] && errors[field]) {
      return `${base} border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10`
    }
    return `${base} border-gray-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-gray-300 dark:hover:border-slate-600`
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-primary-600 ring-1 ring-gray-100 dark:ring-slate-700">
              <Receipt className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                {expense?._id ? 'Edit Expense' : 'Record New Expense'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {expense?._id ? 'Update expense details' : 'Keep track of your business spending'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Expense Details
          </h2>

          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-1.5 group">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Description *
              </label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onBlur={() => handleBlur('title')}
                  className={getInputClass('title')}
                  placeholder="What was this expense for?"
                  autoFocus
                />
              </div>
              {touched.title && errors.title && (
                <p className="text-xs text-red-600 dark:text-red-400 ml-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.title}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div className="space-y-1.5 group">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    onBlur={() => handleBlur('amount')}
                    className={getInputClass('amount')}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {touched.amount && errors.amount && (
                  <p className="text-xs text-red-600 dark:text-red-400 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.amount}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-1.5 group">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    onBlur={() => handleBlur('date')}
                    className={getInputClass('date')}
                  />
                </div>
                {touched.date && errors.date && (
                  <p className="text-xs text-red-600 dark:text-red-400 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.date}
                  </p>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  Category
                </label>
                <ExpenseCategorySelect
                  value={formData.category}
                  onChange={(val) => {
                    setFormData((prev) => ({ ...prev, category: val }))
                    if (val) handleBlur('category')
                  }}
                  categories={categories}
                  placeholder="Categorize this expense"
                  hasError={touched.category && !formData.category}
                />
              </div>

              {/* Status (Admin Only) */}
              {isAdmin && expense?._id && (
                <div className="space-y-1.5 group">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                    Status
                  </label>
                  <div className="relative">
                    <Check className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={getInputClass('status')}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="space-y-1.5 group">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
              Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={`${getInputClass('notes')} pl-10 resize-none h-32`}
                placeholder="Add any additional details about this expense..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 shadow-2xl -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 mt-12 rounded-t-2xl sm:rounded-none">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/expenses"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin-only Status Save Buttons */}
            {isAdmin && !expense?._id && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    if (!validateForm()) return
                    onSave({
                      title: formData.title?.trim(),
                      amount: Number(formData.amount || 0),
                      date: formData.date,
                      category: (formData.category || 'other').trim() || 'other',
                      status: 'approved',
                      notes: formData.notes || undefined,
                    })
                  }}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-95 uppercase tracking-wide text-sm"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save as Approved
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    if (!validateForm()) return
                    onSave({
                      title: formData.title?.trim(),
                      amount: Number(formData.amount || 0),
                      date: formData.date,
                      category: (formData.category || 'other').trim() || 'other',
                      status: 'paid',
                      notes: formData.notes || undefined,
                    })
                  }}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-95 uppercase tracking-wide text-sm"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Save as Paid
                    </>
                  )}
                </button>
              </>
            )}

            {/* Show regular save for editing or non-admin users */}
            {(expense?._id || !isAdmin) && (
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-95"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {expense?._id ? 'Update Expense' : 'Save Expense'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div >
    </form >
  )
}

export default ExpenseForm
