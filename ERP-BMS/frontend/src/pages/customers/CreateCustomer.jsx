import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerService } from '../../services/api/customerService'
import CustomerForm from '../../components/customers/CustomerForm'

const CreateCustomer = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const createCustomer = useMutation(customerService.create, {
        onSuccess: () => {
            toast.success('Customer created successfully')
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            navigate('/customers')
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Failed to create customer')
        },
    })

    const handleSave = (formValues) => {
        createCustomer.mutate(formValues)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link to="/customers" className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transaction-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Customers
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Add New Customer</h1>
            </div>

            <div className="card max-w-2xl">
                <div className="p-6">
                    <CustomerForm
                        onSave={handleSave}
                        onCancel={() => navigate('/customers')}
                        isSaving={createCustomer.isLoading}
                    />
                </div>
            </div>
        </div>
    )
}

export default CreateCustomer
