import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

import ExpenseForm from '../../components/expense/ExpenseForm'
import { expenseService } from '../../services/api/expenseService'

const CreateExpense = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: expensesData } = useQuery(
    ['expenseCategoriesSeed'],
    () => expenseService.getAll({ page: 1, limit: 1000, sort: '-date' }),
    { refetchOnWindowFocus: false }
  )

  const categories = useMemo(() => {
    const defaults = [
      'qalabka_xafiiska',        // Office supplies → alaab & qalab xafiis
      'kirada_guriga',          // Rent → kireynta meel
      'adeegyada_asaasiga',     // Utilities → koronto, biyo, iwm
      'mushahaarka_shaqaalaha',    // Salaries → mushahar shaqaale
      'xayeysiin',              // Marketing → xayaysiin
      'safarro_shaqo',          // Travel → safar shaqo
      'qalab_iyo_agab',         // Equipment → qalab & agab
      'dayactir',               // Maintenance → hagaajin
      'caymis',                 // Insurance → dammaanad / caymis
      'canshuuraha',            // Taxes → canshuur
      'martigelin',             // Entertainment → martigelin macaamiil
      'wax_kale',                   // Other → wax kale
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

  const createExpense = useMutation(expenseService.create, {
    onSuccess: async () => {
      toast.success('Expense created')
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      navigate('/expenses')
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create expense')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/expenses" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Expenses
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Create Expense</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="card p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900">Expense Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                Add a new expense with category, payment method and optional vendor information.
              </p>
            </div>

            <ExpenseForm
              expense={null}
              onSave={(payload) => createExpense.mutate(payload)}
              onCancel={() => navigate('/expenses')}
              isSaving={createExpense.isLoading}
              categories={categories}
              userRole={user?.role}
            />
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="card p-6 sm:p-8 bg-gray-50/60 border border-gray-200/70">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tips</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <div className="font-medium text-gray-800">Use categories</div>
                <div>Keep reporting clean by selecting the right category.</div>
              </div>
              <div>
                <div className="font-medium text-gray-800">Add new category</div>
                <div>Use the Category dropdown to search or add a new category.</div>
              </div>
              <div>
                <div className="font-medium text-gray-800">Vendor & receipt</div>
                <div>Fill these fields when you want better audit history.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateExpense
