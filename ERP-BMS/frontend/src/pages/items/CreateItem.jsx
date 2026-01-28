import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { itemService } from '../../services/api/itemService'
import ItemForm from '../../components/items/ItemForm'

const CreateItem = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const createItem = useMutation(itemService.create, {
        onSuccess: () => {
            toast.success('Item created successfully')
            queryClient.invalidateQueries({ queryKey: ['items'] })
            navigate('/items')
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Failed to create item')
        },
    })

    const handleSave = (formValues) => {
        createItem.mutate(formValues)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link to="/items" className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transaction-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Items
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Create New Item</h1>
            </div>

            <div className="card max-w-2xl">
                <div className="p-6">
                    <ItemForm
                        onSave={handleSave}
                        onCancel={() => navigate('/items')}
                        isSaving={createItem.isLoading}
                    />
                </div>
            </div>
        </div>
    )
}

export default CreateItem
