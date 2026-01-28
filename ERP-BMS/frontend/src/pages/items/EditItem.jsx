import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { itemService } from '../../services/api/itemService'
import ItemForm from '../../components/items/ItemForm'

const EditItem = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: item, isLoading, isError } = useQuery(
        ['item', id],
        () => itemService.getById ? itemService.getById(id) : itemService.getAll().then(res => res.data.find(i => i._id === id)), // Fallback if getById not implemented yet
        {
            enabled: !!id,
        }
    )

    // NOTE: Ideally itemService should have getById. 
    // If it doesn't, we might need to rely on passed state or fetch all and find. 
    // For now assuming getById exists or we fix it. 
    // *Self-correction*: The service might return the item object directly or { data: item }. 
    // Let's assume standard response structure.

    const updateItem = useMutation(
        (payload) => itemService.update(id, payload),
        {
            onSuccess: () => {
                toast.success('Item updated successfully')
                queryClient.invalidateQueries({ queryKey: ['items'] })
                navigate('/items')
            },
            onError: (error) => {
                toast.error(error?.response?.data?.message || 'Failed to update item')
            },
        }
    )

    const handleSave = (formValues) => {
        updateItem.mutate(formValues)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
        )
    }

    if (isError || !item) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">Error loading item</p>
                <Link to="/items" className="text-primary-600 hover:underline mt-4 inline-block">
                    Return to Items
                </Link>
            </div>
        )
    }

    // Handle different API response structures if needed
    const itemData = item.data || item

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link to="/items" className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transaction-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Items
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Item</h1>
            </div>

            <div className="card max-w-2xl">
                <div className="p-6">
                    <ItemForm
                        item={itemData}
                        onSave={handleSave}
                        onCancel={() => navigate('/items')}
                        isSaving={updateItem.isLoading}
                    />
                </div>
            </div>
        </div>
    )
}

export default EditItem
