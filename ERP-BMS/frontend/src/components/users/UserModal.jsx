import { useState, useEffect } from 'react'
import { X, Save, User, Mail, Lock, Shield, AlertCircle } from 'lucide-react'
import { createPortal } from 'react-dom'

const UserModal = ({ isOpen, onClose, onSave, user = null, isSaving = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        isActive: true,
    })
    const [errors, setErrors] = useState({})
    const [touched, setTouched] = useState({})

    useEffect(() => {
        if (isOpen) {
            if (user) {
                setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    password: '',
                    role: user.role || 'staff',
                    isActive: user.isActive ?? true,
                })
            } else {
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'staff',
                    isActive: true,
                })
            }
            setErrors({})
            setTouched({})
        }
    }, [isOpen, user])

    if (!isOpen) return null

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }))
        }
    }

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }))
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.name?.trim()) newErrors.name = 'Name is required'
        if (!formData.email?.trim()) {
            newErrors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format'
        }

        if (!user && !formData.password) {
            newErrors.password = 'Password is required'
        } else if (formData.password && formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
        }

        setErrors(newErrors)
        setTouched({
            name: true,
            email: true,
            password: true,
        })
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validate()) return

        const payload = { ...formData }
        if (user && !payload.password) {
            delete payload.password
        }

        onSave(payload)
    }

    const getInputClass = (field) => {
        const base = "w-full pl-10 pr-4 py-2.5 bg-secondary/50 border rounded-lg outline-none transition-all duration-200 text-sm"
        if (touched[field] && errors[field]) {
            return `${base} border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20`
        }
        return `${base} border-input focus:border-ring focus:ring-2 focus:ring-ring/50 hover:border-input/80`
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-secondary/30">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {user ? 'Edit User' : 'Add New User'}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {user ? 'Update user details and permissions' : 'Create a new system user'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Full Name
                        </label>
                        <div className="relative group">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                onBlur={() => handleBlur('name')}
                                className={getInputClass('name')}
                                placeholder="John Doe"
                            />
                        </div>
                        {touched.name && errors.name && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Email Address
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={() => handleBlur('email')}
                                className={getInputClass('email')}
                                placeholder="john@example.com"
                            />
                        </div>
                        {touched.email && errors.email && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.email}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {user ? 'New Password (Optional)' : 'Password'}
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onBlur={() => handleBlur('password')}
                                className={getInputClass('password')}
                                placeholder={user ? "Leave blank to keep current" : "Min. 6 characters"}
                            />
                        </div>
                        {touched.password && errors.password && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.password}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Role */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Role
                            </label>
                            <div className="relative group">
                                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-10" />
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className={`${getInputClass('role')} appearance-none disabled:opacity-50 disabled:cursor-not-allowed`}
                                    disabled={user?.role === 'admin'}
                                >
                                    <option value="staff">Staff</option>
                                    <option value="accountant">Accountant</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {user?.role === 'admin' && (
                                <p className="text-[10px] text-amber-600">Admin roles locked</p>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                            <label className={`flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-accent transition-colors ${user?.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <div className="relative inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                        disabled={user?.role === 'admin'}
                                    />
                                    <div className="w-9 h-5 bg-muted peer-focus:ring-2 peer-focus:ring-ring/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    Active
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-all border border-border/50"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {user ? 'Update User' : 'Create User'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default UserModal
