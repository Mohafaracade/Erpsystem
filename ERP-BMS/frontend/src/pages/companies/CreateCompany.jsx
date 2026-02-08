import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { companyService } from '../../services/api/companyService'
import { Building2, ArrowLeft, Save } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { toast } from 'react-hot-toast'

const CreateCompany = () => {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subscription: {
      plan: 'free',
      status: 'trial',
      billingCycle: 'monthly',
      maxUsers: 5,
      maxStorage: 1000,
    },
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      invoicePrefix: 'INV',
      receiptPrefix: 'REC',
    },
  })

  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/dashboard')
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('subscription.')) {
      const field = name.split('.')[1]
      setFormData({
        ...formData,
        subscription: { ...formData.subscription, [field]: value }
      })
    } else if (name.startsWith('settings.')) {
      const field = name.split('.')[1]
      setFormData({
        ...formData,
        settings: { ...formData.settings, [field]: value }
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await companyService.create(formData)
      toast.success('Company created successfully')
      navigate('/companies')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create company')
    } finally {
      setLoading(false)
    }
  }

  if (!isSuperAdmin()) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Company</h1>
          <p className="text-muted-foreground mt-1">Add a new company to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subscription.plan">Plan</Label>
                <select
                  id="subscription.plan"
                  name="subscription.plan"
                  value={formData.subscription.plan}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription.status">Status</Label>
                <select
                  id="subscription.status"
                  name="subscription.status"
                  value={formData.subscription.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription.billingCycle">Billing Cycle</Label>
                <select
                  id="subscription.billingCycle"
                  name="subscription.billingCycle"
                  value={formData.subscription.billingCycle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription.maxUsers">Max Users</Label>
                <Input
                  id="subscription.maxUsers"
                  name="subscription.maxUsers"
                  type="number"
                  value={formData.subscription.maxUsers}
                  onChange={handleChange}
                  min="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Company Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings.currency">Currency</Label>
                <Input
                  id="settings.currency"
                  name="settings.currency"
                  value={formData.settings.currency}
                  onChange={handleChange}
                  placeholder="USD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings.timezone">Timezone</Label>
                <Input
                  id="settings.timezone"
                  name="settings.timezone"
                  value={formData.settings.timezone}
                  onChange={handleChange}
                  placeholder="UTC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings.invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="settings.invoicePrefix"
                  name="settings.invoicePrefix"
                  value={formData.settings.invoicePrefix}
                  onChange={handleChange}
                  placeholder="INV"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings.receiptPrefix">Receipt Prefix</Label>
                <Input
                  id="settings.receiptPrefix"
                  name="settings.receiptPrefix"
                  value={formData.settings.receiptPrefix}
                  onChange={handleChange}
                  placeholder="REC"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/companies')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Company'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateCompany

