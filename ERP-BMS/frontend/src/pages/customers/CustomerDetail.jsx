import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { customerService } from '../../services/api/customerService'
import { ArrowLeft } from 'lucide-react'

const CustomerDetail = () => {
  const { id } = useParams()

  const { data: customer, isLoading } = useQuery(
    ['customer', id],
    () => customerService.getById(id)
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!customer) {
    return <div>Customer not found</div>
  }

  return (
    <div className="space-y-6">
      <Link to="/customers" className="flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Customers
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{customer.name}</h1>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
            <p className="text-gray-900">{customer.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
            <p className="text-gray-900">{customer.phone || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
            <p className="text-gray-900">{customer.address || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetail

