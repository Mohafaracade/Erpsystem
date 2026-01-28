import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { ArrowLeft, Loader2, Info } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

import ExpenseForm from '../../components/expense/ExpenseForm'
import { expenseService } from '../../services/api/expenseService'

const EditExpense = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // Fetch expense data
    const { data: expenseResponse, isLoading: isExpenseLoading, error: expenseError } = useQuery(
        ['expense', id],
        () => expenseService.getById(id),
        { enabled: !!id }
    )

    const expense = expenseResponse?.data

    // Fetch categories (seed logic similar to CreateExpense)
    const { data: expensesData } = useQuery(
        ['expenseCategoriesSeed'],
        () => expenseService.getAll({ page: 1, limit: 1000, sort: '-date' }),
        { refetchOnWindowFocus: false }
    )

    const categories = useMemo(() => {
        const defaults = [
            'office_supplies', 'rent', 'utilities', 'marketing',
            'travel', 'equipment', 'maintenance', 'taxes',
            'professional_fees', 'entertainment', 'other'
        ]

        const list = expensesData?.data || []
        const fromData = list.map((e) => (e?.category || '').trim()).filter(Boolean)

        const combined = [...fromData, ...defaults]
        const seen = new Set()
        const unique = []
        for (const c of combined) {
            const key = c.toLowerCase()
            if (seen.has(key) || key === 'salaries' || key === 'insurance' || key === 'caymis' || key === 'mushaharka_shaqlaha') continue
            seen.add(key)
            unique.push(c)
        }
        return unique
    }, [expensesData])

    const updateExpense = useMutation(
        (payload) => expenseService.update(id, payload),
        {
            onSuccess: async () => {
                toast.success('Expense updated')
                await queryClient.invalidateQueries({ queryKey: ['expenses'] })
                navigate('/expenses')
            },
            onError: (error) => {
                toast.error(error?.response?.data?.message || 'Failed to update expense')
            },
        }
    )

    if (isExpenseLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
                <p className="text-gray-500 font-medium">Loading expense details...</p>
            </div>
        )
    }

    if (expenseError) {
        return (
            <div className="card p-8 text-center border-rose-100 bg-rose-50/20">
                <div className="text-rose-500 font-bold mb-2 text-lg">Error Loading Expense</div>
                <p className="text-gray-600 mb-6">{expenseError?.response?.data?.message || 'Expense not found'}</p>
                <Link to="/expenses" className="btn-secondary inline-flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Expenses
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link to="/expenses" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="font-medium">Back to Expenses</span>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Expense</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <div className="card shadow-xl border-none p-0 overflow-hidden">
                        <div className="bg-gray-50/50 dark:bg-slate-950/30 p-6 border-b border-gray-100 dark:border-slate-800">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Expense Details</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Update the category, amount, or other details for this expense entry.
                            </p>
                        </div>
                        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900">
                            <ExpenseForm
                                expense={expense}
                                onSave={(payload) => updateExpense.mutate(payload)}
                                onCancel={() => navigate('/expenses')}
                                isSaving={updateExpense.isLoading}
                                categories={categories}
                                userRole={user?.role}
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-4">
                    <div className="card p-6 bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20">
                        <h3 className="flex items-center text-blue-900 dark:text-blue-300 font-bold mb-3">
                            <Info className="w-4 h-4 mr-2" />
                            Information
                        </h3>
                        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-400">
                            <p>You are editing an existing expense record. All changes will be reflected in your reports and analytics immediately after saving.</p>
                            <div>
                                <strong>Entry created on:</strong>
                                <p>{expense?.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'Unknown'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EditExpense
