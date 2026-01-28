import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import {
  Plus,
  Trash2,
  FileText,
  User,
  Calendar,
  Box,
  DollarSign,
  Percent,
  Save,
  X,
  AlertCircle,
  Check,
  HelpCircle,
  ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'

import CustomerSelect from '../customers/CustomerSelect'
import ItemSelect from '../items/ItemSelect'

const emptyItem = { itemId: '', quantity: 1, rate: 0, tax: 0 }

const ReceiptForm = ({
  receipt,
  onSave,
  onCancel,
  isSaving,
  itemsOptions = [],
  customersOptions = [],
}) => {
  const [formData, setFormData] = useState({
    customer: '',
    receiptDate: new Date().toISOString().split('T')[0],
    items: [emptyItem],
    notes: '',
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  useEffect(() => {
    if (receipt) {
      setFormData({
        customer:
          receipt.customer?._id ||
          receipt.customer ||
          receipt.customerDetails?._id ||
          receipt.customerDetails?.id ||
          '',
        receiptDate: receipt.receiptDate
          ? new Date(receipt.receiptDate).toISOString().split('T')[0]
          : '',
        items:
          receipt.items?.map((it) => ({
            itemId: it.item?._id || it.item,
            quantity: it.quantity || 1,
            rate: it.rate || it.itemDetails?.sellingPrice || 0,
            tax: it.tax || 0,
          })) || [emptyItem],
        notes: receipt.notes || '',
      })
    } else {
      setFormData({
        customer: '',
        receiptDate: new Date().toISOString().split('T')[0],
        items: [emptyItem],
        notes: '',
      })
    }
  }, [receipt])

  const isCreateMode = !receipt?._id

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'customer' && isCreateMode) {
      setFormData((prev) => ({
        ...prev,
        customer: value,
        items: [emptyItem],
        notes: '',
      }))

      // Clear error regarding customer
      if (errors.customer) {
        setErrors(prev => ({ ...prev, customer: '' }))
      }
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items]
    updated[index] = { ...updated[index], [field]: value }
    setFormData((prev) => ({ ...prev, items: updated }))

    // Clear item error if exists
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: '' }))
    }
    if (errors[`item_${index}_quantity`]) {
      setErrors(prev => ({ ...prev, [`item_${index}_quantity`]: '' }))
    }
  }

  const handleItemSelect = (index, itemId) => {
    const selected = itemsOptions.find((it) => it._id === itemId)
    const updated = [...formData.items]
    updated[index] = {
      ...updated[index],
      itemId,
      rate: selected?.sellingPrice || 0,
    }
    setFormData((prev) => ({ ...prev, items: updated }))
  }

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem],
    }))
  }

  const removeItem = (index) => {
    if (formData.items.length === 1) return
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const calculateTotals = () => {
    const subTotal = formData.items.reduce(
      (sum, it) => sum + (Number(it.quantity || 0) * Number(it.rate || 0)),
      0
    )
    const taxTotal = formData.items.reduce(
      (sum, it) =>
        sum +
        Number(it.quantity || 0) *
        Number(it.rate || 0) *
        (Number(it.tax || 0) / 100),
      0
    )
    const total = subTotal + taxTotal
    return { subTotal, taxTotal, total }
  }

  const validateForm = () => {
    const newErrors = {}

    // Customer is now optional for walk-in sales
    // if (!formData.customer) {
    //   newErrors.customer = 'Customer is required'
    // }

    if (!formData.receiptDate) {
      newErrors.receiptDate = 'Receipt date is required'
    }

    if (!formData.items || formData.items.length === 0) {
      newErrors.items = 'At least one item is required'
    } else {
      // Check for items without selection
      if (!formData.items.some(item => item.itemId)) {
        newErrors.items = 'Please select at least one item'
      }

      // specific item validation
      formData.items.forEach((item, idx) => {
        if (item.itemId && (item.quantity <= 0 || !item.quantity)) {
          newErrors[`item_${idx}_quantity`] = 'Invalid quantity'
        }
      })
    }

    setErrors(newErrors)
    setTouched({
      customer: true,
      receiptDate: true,
    })

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const itemsPayload = formData.items.map((it) => {
      const base = Number(it.quantity || 0) * Number(it.rate || 0)
      const lineTax = base * (Number(it.tax || 0) / 100)
      return {
        item: it.itemId,
        quantity: Number(it.quantity || 0),
        rate: Number(it.rate || 0),
        tax: Number(it.tax || 0),
        amount: base + lineTax,
      }
    })

    const totals = calculateTotals()

    onSave({
      customer: formData.customer,
      receiptDate: formData.receiptDate,
      items: itemsPayload,
      subTotal: totals.subTotal,
      discount: 0,
      shippingCharges: 0,
      taxTotal: totals.taxTotal,
      total: totals.total,
      notes: formData.notes || '',
    })
  }

  const getInputClass = (field) => {
    const base = "w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border rounded-xl outline-none transition-all duration-200"
    if (touched[field] && errors[field]) {
      return `${base} border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10`
    }
    return `${base} border-gray-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-gray-300 dark:hover:border-slate-600`
  }

  const totals = calculateTotals()

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Professional Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-primary-600 ring-1 ring-gray-100 dark:ring-slate-700">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                  {receipt ? 'Edit Receipt' : 'Creates Sales Receipt'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {receipt ? 'Update receipt details' : 'Record a new sales receipt'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Content */}
        <div className="p-8">
          <div className="grid grid-cols-12 gap-8 mb-8">
            {/* Customer Section */}
            <div className="col-span-12 lg:col-span-7">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  <User className="w-4 h-4" />
                  Customer <span className="text-gray-400 normal-case font-normal">(Optional)</span>
                </label>
                <div className="p-6 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                  <CustomerSelect
                    value={formData.customer}
                    onChange={(id) => handleChange({ target: { name: 'customer', value: id } })}
                    customers={customersOptions}
                    required={false}
                  />
                  {touched.customer && errors.customer && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-2 animate-in slide-in-from-top-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.customer}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="space-y-1.5 group">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  Receipt Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input
                    type="date"
                    name="receiptDate"
                    value={formData.receiptDate}
                    onChange={handleChange}
                    onBlur={() => handleBlur('receiptDate')}
                    required
                    className={getInputClass('receiptDate')}
                  />
                </div>
                {touched.receiptDate && errors.receiptDate && (
                  <p className="text-xs text-red-600 dark:text-red-400 ml-1">{errors.receiptDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Box className="w-5 h-5 text-primary-500" />
                Items & Services
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Line Item
              </button>
            </div>

            {errors.items && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4" />
                {errors.items}
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Item Details</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-32">Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-40">Rate</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-32">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Tax %</span>
                          <div className="group/tooltip relative inline-block">
                            <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                            <div className="invisible group-hover/tooltip:visible absolute right-0 top-5 z-10 w-48 p-2 bg-gray-900 dark:bg-slate-800 text-white text-[10px] rounded-lg shadow-lg whitespace-normal">
                              Tax rate (%) applied to item. Amount = Rate × Qty × (1 + Tax/100)
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-40">Amount</th>
                      <th className="px-6 py-4 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {formData.items.map((it, index) => {
                      const base = Number(it.quantity || 0) * Number(it.rate || 0)
                      const lineTax = base * (Number(it.tax || 0) / 100)
                      const lineTotal = base + lineTax
                      const hasError = errors[`item_${index}_quantity`]

                      return (
                        <tr key={index} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 align-top">
                            <ItemSelect
                              value={it.itemId}
                              onChange={(id) => handleItemSelect(index, id)}
                              items={itemsOptions}
                            />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className={`w-full text-right px-3 py-2.5 bg-white dark:bg-slate-900 border ${hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 dark:border-slate-700 focus:border-primary-500'} rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 transition-all`}
                            />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.rate}
                                onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-full text-right pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={it.tax}
                                onChange={(e) => handleItemChange(index, 'tax', parseFloat(e.target.value) || 0)}
                                className="w-full text-right pr-8 pl-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all"
                              />
                              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top text-right pt-5">
                            <span className="font-semibold text-gray-900 dark:text-slate-100">
                              ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top pt-3.5">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Notes + Totals */}
          <div className="grid grid-cols-12 gap-8">
            {/* Notes Section */}
            <div className="col-span-12 lg:col-span-7 space-y-3">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Notes
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <textarea
                  name="notes"
                  rows="4"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Add any additional notes..."
                  className={`${getInputClass('notes')} pl-10 resize-none`}
                />
              </div>
            </div>

            {/* Totals Card */}
            <div className="col-span-12 lg:col-span-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-6 uppercase tracking-wider">
                  Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      ${totals.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">Tax Total</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      ${totals.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-4 mt-2 border-t border-dashed border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-slate-100">Total</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 shadow-2xl -mx-4 sm:-mx-8 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/receipts"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {receipt ? 'Update Receipt' : 'Create Receipt'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

export default ReceiptForm

