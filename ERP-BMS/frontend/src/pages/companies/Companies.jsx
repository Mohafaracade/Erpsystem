import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { companyService } from '../../services/api/companyService'
import { Building2, Plus, Search, MoreVertical, Edit, Trash2, Users, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { toast } from 'react-hot-toast'

const Companies = () => {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/dashboard')
      return
    }
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const response = await companyService.getAll({ search })
      setCompanies(response.data || [])
    } catch (error) {
      toast.error('Failed to load companies')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this company?')) return
    
    try {
      await companyService.delete(id)
      toast.success('Company deactivated successfully')
      fetchCompanies()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate company')
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
      trial: { label: 'Trial', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
      suspended: { label: 'Suspended', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
      cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    }
    const statusInfo = statusMap[status] || statusMap.active
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  if (!isSuperAdmin()) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage all companies and subscriptions</p>
        </div>
        <Button onClick={() => navigate('/companies/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Company
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchCompanies()}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Companies List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No companies found</h3>
            <p className="text-muted-foreground mb-4">Get started by creating your first company</p>
            <Button onClick={() => navigate('/companies/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {companies.map((company) => (
            <Card key={company._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{company.name}</h3>
                        <p className="text-sm text-muted-foreground">{company.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4">
                      {getStatusBadge(company.subscription?.status || 'active')}
                      <span className="text-sm text-muted-foreground">
                        Plan: <span className="font-medium capitalize">{company.subscription?.plan || 'free'}</span>
                      </span>
                      {company.phone && (
                        <span className="text-sm text-muted-foreground">{company.phone}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/companies/${company._id}/users`)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Users
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/companies/${company._id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {company.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(company._id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Companies

