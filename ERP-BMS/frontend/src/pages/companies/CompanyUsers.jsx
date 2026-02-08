import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { companyService } from '../../services/api/companyService'
import { ArrowLeft, Plus, Users, Mail, Shield, User as UserIcon } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { toast } from 'react-hot-toast'

const CompanyUsers = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin, isCompanyAdmin } = useAuth()
  const [company, setCompany] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSuperAdmin() && !isCompanyAdmin()) {
      navigate('/dashboard')
      return
    }
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [companyRes, usersRes] = await Promise.all([
        companyService.getById(id),
        companyService.getUsers(id)
      ])
      setCompany(companyRes.data || companyRes)
      setUsers(usersRes.data || usersRes || [])
    } catch (error) {
      toast.error('Failed to load company users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role) => {
    const roleMap = {
      super_admin: { label: 'Super Admin', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
      company_admin: { label: 'Company Admin', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
      admin: { label: 'Admin', color: 'bg-primary/10 text-primary' },
      accountant: { label: 'Accountant', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
      staff: { label: 'Staff', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
    }
    const roleInfo = roleMap[role] || roleMap.staff
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {company?.name} - Users
          </h1>
          <p className="text-muted-foreground mt-1">Manage users for this company</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => navigate(`/companies/${id}/users/create`)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">Add users to this company</p>
            <Button onClick={() => navigate(`/companies/${id}/users/create`)}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user._id || user.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(user.role)}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.isActive 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
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

export default CompanyUsers

