import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

import ReceiptForm from '../../components/receipts/ReceiptForm'
import { receiptService } from '../../services/api/receiptService'
import { itemService } from '../../services/api/itemService'
import { customerService } from '../../services/api/customerService'

const EditReceipt = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // Fetch receipt data
    const { data: receiptResponse, isLoading: isReceiptLoading, error: receiptError } = useQuery(
        ['receipt', id],
        () => receiptService.getById(id),
        { enabled: !!id }
    )

    const receipt = receiptResponse?.data

    // Fetch items and customers for the form options
    const { data: itemsData } = useQuery('items', () =>
        itemService.getAll({ limit: 1000 })
    )
    const { data: customersData } = useQuery('customers', () =>
        customerService.getAll({ limit: 1000 })
    )

    const itemsOptions = useMemo(() => itemsData?.data || [], [itemsData])
    const customersOptions = useMemo(() => customersData?.data || [], [customersData])

    const updateReceipt = useMutation(
        (payload) => receiptService.update(id, payload),
        {
            onSuccess: async () => {
                toast.success('Receipt updated')
                await queryClient.invalidateQueries({ queryKey: ['receipts'] })
                navigate('/receipts')
            },
            onError: (error) => {
                toast.error(error?.response?.data?.message || 'Failed to update receipt')
            },
        }
    )

    const handleSave = (formValues) => {
        updateReceipt.mutate(formValues)
    }

    if (isReceiptLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
                <p className="text-gray-500 font-medium">Loading receipt details...</p>
            </div>
        )
    }

    if (receiptError) {
        return (
            <div className="card p-8 text-center">
                <div className="text-red-500 font-bold mb-2">Error loading receipt</div>
                <p className="text-gray-600 mb-4">{receiptError?.response?.data?.message || 'Receipt not found'}</p>
                <Link to="/receipts" className="btn-secondary inline-flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Receipts
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link
                    to="/receipts"
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="font-medium">Back to Receipts</span>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Receipt</h1>
            </div>

            <div className="card p-0 overflow-hidden border-none shadow-lg">
                <div className="bg-gray-50/50 dark:bg-slate-950/30 p-6 border-b border-gray-100 dark:border-slate-800">
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        Update the details for <strong>{receipt?.salesReceiptNumber}</strong>
                    </p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900">
                    <ReceiptForm
                        receipt={receipt}
                        onSave={handleSave}
                        onCancel={() => navigate('/receipts')}
                        isSaving={updateReceipt.isLoading}
                        itemsOptions={itemsOptions}
                        customersOptions={customersOptions}
                    />
                </div>
            </div>
        </div>
    )
}

export default EditReceipt
