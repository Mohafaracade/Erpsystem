import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'

import ReceiptForm from '../../components/receipts/ReceiptForm'
import { receiptService } from '../../services/api/receiptService'
import { itemService } from '../../services/api/itemService'
import { customerService } from '../../services/api/customerService'

const CreateReceipt = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: itemsData } = useQuery('items', () =>
    itemService.getAll({ limit: 1000 })
  )
  const { data: customersData } = useQuery('customers', () =>
    customerService.getAll({ limit: 1000 })
  )

  const itemsOptions = useMemo(() => itemsData?.data || [], [itemsData])
  const customersOptions = useMemo(() => customersData?.data || [], [customersData])

  const createReceipt = useMutation(receiptService.create, {
    onSuccess: async () => {
      toast.success('Receipt created')
      await queryClient.invalidateQueries({ queryKey: ['receipts'] })
      navigate('/receipts')
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create receipt')
    },
  })

  const createReceiptFromInvoice = useMutation(receiptService.createFromInvoice, {
    onSuccess: async () => {
      toast.success('Receipt created from invoice')
      await queryClient.invalidateQueries({ queryKey: ['receipts'] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate('/receipts')
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || 'Failed to create receipt from invoice'
      )
    },
  })

  const isSaving = createReceipt.isLoading || createReceiptFromInvoice.isLoading

  const handleSave = (formValues) => {
    if (formValues?.invoiceId) {
      createReceiptFromInvoice.mutate({
        invoiceId: formValues.invoiceId,
        paymentMethod: 'cash',
        notes: formValues.notes || undefined,
      })
    } else {
      createReceipt.mutate(formValues)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/receipts"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Receipts
        </Link>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Create Receipt</h1>
      </div>

      <ReceiptForm
        receipt={null}
        onSave={handleSave}
        onCancel={() => navigate('/receipts')}
        isSaving={isSaving}
        itemsOptions={itemsOptions}
        customersOptions={customersOptions}
      />
    </div>
  )
}

export default CreateReceipt
