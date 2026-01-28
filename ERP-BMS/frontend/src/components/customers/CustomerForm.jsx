import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Phone,
  Building2,
  Users,
  Check,
  Mail,
  MapPin,
  Briefcase,
  AlertCircle,
  HelpCircle,
  ArrowLeft
} from 'lucide-react'

const defaultState = {
  fullName: '',
  customerType: 'individual',
  phone: '',
  email: '',
  address: '',
}

const CustomerForm = ({ customer, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState(defaultState)
  const [touched, setTouched] = useState({})

  useEffect(() => {
    if (customer) {
      setFormData({
        fullName: customer.fullName || '',
        customerType: customer.customerType || 'individual',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
      })
    } else {
      setFormData(defaultState)
    }
  }, [customer])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      customerType: formData.customerType || 'individual',
    })
  }

  const isValid = (field) => {
    if (field === 'fullName') return formData.fullName.trim().length > 0
    if (field === 'phone') {
      // Enhanced phone validation (must have at least 7 digits)
      const digitsOnly = formData.phone.replace(/\D/g, '')
      return digitsOnly.length >= 7
    }
    if (field === 'email' && formData.email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    }
    return true
  }

  const getErrorMessage = (field) => {
    if (field === 'fullName' && !isValid('fullName')) {
      return 'Customer name is required'
    }
    if (field === 'phone' && !isValid('phone')) {
      return 'Please enter a valid phone number (min 7 digits)'
    }
    if (field === 'email' && formData.email && !isValid('email')) {
      return 'Please enter a valid email address'
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
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      {/* Header with Visual Summary */}
      <div className="bg-primary-50/50 dark:bg-slate-800/50 rounded-2xl p-4 border border-primary-100 dark:border-slate-700 flex items-start gap-3">
        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-primary-600">
          {formData.customerType === 'business' ? (
            <Building2 className="w-5 h-5" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {formData.fullName || 'New Customer'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {formData.customerType === 'business' ? 'Business' : 'Individual'} • {formData.phone || 'No phone'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div className="md:col-span-2 space-y-1.5 group">
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              onBlur={() => handleBlur('fullName')}
              className={getInputClass('fullName')}
              placeholder="Geli magac"
              required
              maxLength={200}
              autoFocus
            />
            {touched.fullName && isValid('fullName') && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-in fade-in zoom-in" />
            )}
          </div>
          {touched.fullName && !isValid('fullName') && (
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{getErrorMessage('fullName')}</span>
            </div>
          )}
        </div>

        {/* Customer Type */}
        <div className="space-y-1.5 group">
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            Type
          </label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <select
              name="customerType"
              value={formData.customerType}
              onChange={handleChange}
              className={`${getInputClass('customerType')} appearance-none cursor-pointer`}
              required
            >
              <option value="individual" className="bg-white dark:bg-slate-900">Individual</option>
              <option value="business" className="bg-white dark:bg-slate-900">Business</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 rotate-45 mb-0.5"></div>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5 group">
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={() => handleBlur('phone')}
              className={getInputClass('phone')}
              placeholder="+25206147190402929"
              required
              maxLength={20}
            />
            {touched.phone && isValid('phone') && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-in fade-in zoom-in" />
            )}
          </div>
          {touched.phone && !isValid('phone') && (
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{getErrorMessage('phone')}</span>
            </div>
          )}
        </div>

        {/* Email (Optional) */}
        <div className="md:col-span-2 space-y-1.5 group">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            <span>Email Address</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full font-normal">Optional</span>
            <div className="group/tooltip relative">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              <div className="invisible group-hover/tooltip:visible absolute left-0 top-5 z-10 w-64 p-2 bg-gray-900 dark:bg-slate-800 text-white text-[10px] rounded-lg shadow-lg">
                Email is optional but recommended for sending invoices and receipts
              </div>
            </div>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              className={getInputClass('email')}
              placeholder="customer@example.com"
              maxLength={100}
            />
            {touched.email && formData.email && isValid('email') && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-in fade-in zoom-in" />
            )}
          </div>
          {touched.email && formData.email && !isValid('email') && (
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{getErrorMessage('email')}</span>
            </div>
          )}
        </div>

        {/* Address (Optional) */}
        <div className="md:col-span-2 space-y-1.5 group">
          <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            Address
            <span className="text-[10px] ml-1.5 px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full font-normal">Optional</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className={`${getInputClass('address')} pl-10`}
              placeholder="Street address, city, state, ZIP code..."
              maxLength={300}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-[10px] text-gray-400">
              {formData.address?.length || 0}/300
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
        <Link
          to="/customers"
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
              customer ? 'Save Changes' : 'Create Customer'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

export default CustomerForm
