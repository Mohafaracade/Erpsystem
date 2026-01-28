import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { userService } from '../../services/api/userService'
import { Plus, Edit2, Trash2, Shield, Mail, User } from 'lucide-react'
import { toast } from 'react-hot-toast'
import UserModal from '../../components/users/UserModal'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'

const Users = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const { data, isLoading } = useQuery('users', () => userService.getAll())
  const users = data?.data || []

  const createMutation = useMutation((newUser) => userService.create(newUser), {
    onSuccess: () => {
      queryClient.invalidateQueries('users')
      toast.success('User created successfully')
      setIsModalOpen(false)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create user')
    },
  })

  const updateMutation = useMutation(
    ({ id, data }) => userService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users')
        toast.success('User updated successfully')
        setIsModalOpen(false)
        setSelectedUser(null)
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || 'Failed to update user')
      },
    }
  )

  const deleteMutation = useMutation((id) => userService.delete(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('users')
      toast.success('User deleted successfully')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete user')
    },
  })

  const handleCreate = () => {
    setSelectedUser(null)
    setIsModalOpen(true)
  }

  const handleEdit = (user) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSave = (userData) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser._id, data: userData })
    } else {
      createMutation.mutate(userData)
    }
  }

  const isSaving = createMutation.isLoading || updateMutation.isLoading

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">Manage system users and their permissions</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-muted rounded-full">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p>No users found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="group hover:bg-accent transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          <span className="font-medium text-foreground">{user.name}</span>
                          </div>
                        </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-muted text-foreground capitalize border">
                            <Shield className="w-3 h-3" />
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-end">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                              onClick={() => handleEdit(user)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-primary"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                          </Button>
                            {user.role !== 'admin' && (
                            <Button
                                onClick={() => handleDelete(user._id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-destructive"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        user={selectedUser}
        isSaving={isSaving}
      />
    </div>
  )
}

export default Users
