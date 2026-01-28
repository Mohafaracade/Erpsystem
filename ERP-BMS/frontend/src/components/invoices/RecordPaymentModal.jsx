import { useState, useEffect } from 'react'
import { X, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react'
import { format } from 'date-fns'

const RecordPaymentModal = ({ isOpen, onClose, invoice, onConfirm, isSubmitting }) => {
    const [formData, setFormData] = useState({
        amount: '',
        method: 'cash',
        date: format(new Date(), 'yyyy-MM-dd'),
        reference: '',
        note: ''
    })
    const [errors, setErrors] = useState({})

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen && invoice) {
            setFormData({
                amount: (invoice.balanceDue || 0).toString(),
                method: 'cash',
                date: format(new Date(), 'yyyy-MM-dd'),
                reference: '',
                note: ''
            })
            setErrors({})
        }
    }, [isOpen, invoice])

    if (!isOpen || !invoice) return null

    const validate = () => {
        const newErrors = {}
        const amount = parseFloat(formData.amount)
        const balance = parseFloat(invoice.balanceDue || 0)

        if (!formData.amount || isNaN(amount)) {
            newErrors.amount = 'Valid amount is required'
        } else if (amount <= 0) {
            newErrors.amount = 'Amount must be greater than zero'
        } else if (amount > balance + 0.01) {
            newErrors.amount = `Amount cannot exceed remaining balance ($${balance.toFixed(2)})`
        }

        if (!formData.method) {
            newErrors.method = 'Payment method is required'
        }

        if (!formData.date) {
            newErrors.date = 'Payment date is required'
        } else if (new Date(formData.date) > new Date()) {
            newErrors.date = 'Date cannot be in the future'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (validate()) {
            onConfirm(formData)
        }
    }

    const isValid = Object.keys(errors).length === 0 && formData.amount && formData.date

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="relative p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-2xl">
                            <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Record Payment</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Invoice #{invoice.invoiceNumber}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Amount Field */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Amount Paid *</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                onBlur={validate}
                                placeholder="0.00"
                                className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-950/50 border ${errors.amount ? 'border-red-500' : 'border-transparent dark:border-slate-800'} focus:bg-white dark:focus:bg-slate-950 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 rounded-2xl transition-all outline-none text-sm font-medium dark:text-slate-200`}
                            />
                        </div>
                        {errors.amount && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.amount}</p>}
                    </div>

                    {/* Date Field */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Payment Date *</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                onBlur={validate}
                                className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-950/50 border ${errors.date ? 'border-red-500' : 'border-transparent dark:border-slate-800'} focus:bg-white dark:focus:bg-slate-950 rounded-2xl transition-all outline-none text-sm font-medium dark:text-slate-200`}
                            />
                        </div>
                        {errors.date && <p className="text-xs text-red-500 font-medium mt-1">{errors.date}</p>}
                    </div>

                    {/* Reference Field */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-1">Reference #</label>
                        <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="Transaction ID / Ref #"
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-950/50 border border-transparent dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 rounded-2xl transition-all outline-none text-sm font-medium dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !isValid}
                            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center min-w-[120px]"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : 'Confirm Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default RecordPaymentModal
