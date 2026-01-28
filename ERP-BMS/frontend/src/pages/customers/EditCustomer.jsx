import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerService } from '../../services/api/customerService'
import CustomerForm from '../../components/customers/CustomerForm'

const EditCustomer = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: customer, isLoading, isError } = useQuery(
        ['customer', id],
        () => customerService.getById(id),
        {
            enabled: !!id,
        }
    )

    const updateCustomer = useMutation(
        (payload) => customerService.update(id, payload),
        {
            onSuccess: () => {
                toast.success('Customer updated successfully')
                queryClient.invalidateQueries({ queryKey: ['customers'] })
                navigate('/customers')
            },
            onError: (error) => {
                toast.error(error?.response?.data?.message || 'Failed to update customer')
            },
        }
    )

    const handleSave = (formValues) => {
        updateCustomer.mutate(formValues)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
        )
    }

    if (isError || !customer) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">Error loading customer</p>
                <Link to="/customers" className="text-primary-600 hover:underline mt-4 inline-block">
                    Return to Customers
                </Link>
            </div>
        )
    }

    // Handle potentially different response structure
    // Backend returns { success: true, data: { customer: { ... } } }
    const customerData = customer?.data?.customer || customer?.customer || customer?.data || customer

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link to="/customers" className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transaction-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Customers
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Customer</h1>
            </div>

            <div className="card max-w-2xl">
                <div className="p-6">
                    <CustomerForm
                        customer={customerData}
                        onSave={handleSave}
                        onCancel={() => navigate('/customers')}
                        isSaving={updateCustomer.isLoading}
                    />
                </div>
            </div>
        </div>
    )
}

export default EditCustomer
