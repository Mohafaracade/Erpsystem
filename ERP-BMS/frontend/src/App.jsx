import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import PrivateRoute from './components/routing/PrivateRoute'

// Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/invoices/Invoices'
import InvoiceDetail from './pages/invoices/InvoiceDetail'
import CreateInvoice from './pages/invoices/CreateInvoice'
import EditInvoice from './pages/invoices/EditInvoice'
import Customers from './pages/customers/Customers'
import CreateCustomer from './pages/customers/CreateCustomer'
import EditCustomer from './pages/customers/EditCustomer'
import CustomerDetail from './pages/customers/CustomerDetail'
import Items from './pages/items/Items'
import CreateItem from './pages/items/CreateItem'
import EditItem from './pages/items/EditItem'
import Receipts from './pages/receipts/Receipts'
import CreateReceipt from './pages/receipts/CreateReceipt'
import EditReceipt from './pages/receipts/EditReceipt'
import Expenses from './pages/expenses/Expenses'
import CreateExpense from './pages/expenses/CreateExpense'
import EditExpense from './pages/expenses/EditExpense'
import Reports from './pages/reports/Reports'
import Users from './pages/users/Users'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import Companies from './pages/companies/Companies'
import CreateCompany from './pages/companies/CreateCompany'
import EditCompany from './pages/companies/EditCompany'
import CompanyUsers from './pages/companies/CompanyUsers'
import CreateCompanyUser from './pages/companies/CreateCompanyUser'

// Layout
import Layout from './components/layout/Layout'
import AdminRoute from './components/routing/AdminRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Invoice Routes */}
                <Route path="invoices" element={<Invoices />} />
                <Route path="invoices/create" element={<CreateInvoice />} />
                <Route path="invoices/:id" element={<InvoiceDetail />} />
                <Route path="invoices/:id/edit" element={<EditInvoice />} />

                {/* Customer Routes */}
                <Route path="customers" element={<Customers />} />
                <Route path="customers/create" element={<CreateCustomer />} />
                <Route path="customers/:id" element={<CustomerDetail />} />
                <Route path="customers/:id/edit" element={<EditCustomer />} />

                {/* Item Routes */}
                <Route path="items" element={<Items />} />
                <Route path="items/create" element={<CreateItem />} />
                <Route path="items/:id/edit" element={<EditItem />} />

                {/* Receipt Routes */}
                <Route path="receipts" element={<Receipts />} />
                <Route path="sales/create" element={<CreateReceipt />} />
                <Route path="sales/:id/edit" element={<EditReceipt />} />

                {/* Expense Routes */}
                <Route path="expenses" element={<Expenses />} />
                <Route path="expenses/create" element={<CreateExpense />} />
                <Route path="expenses/:id/edit" element={<EditExpense />} />

                {/* Report Routes */}
                <Route path="reports" element={<Reports />} />

                {/* User Routes */}
                <Route 
                  path="users" 
                  element={
                    <AdminRoute>
                      <Users />
                    </AdminRoute>
                  } 
                />

                {/* Company Routes (Super Admin Only) */}
                <Route 
                  path="companies" 
                  element={
                    <AdminRoute requireSuperAdmin={true}>
                      <Companies />
                    </AdminRoute>
                  } 
                />
                <Route 
                  path="companies/create" 
                  element={
                    <AdminRoute requireSuperAdmin={true}>
                      <CreateCompany />
                    </AdminRoute>
                  } 
                />
                <Route 
                  path="companies/:id/edit" 
                  element={
                    <AdminRoute requireSuperAdmin={true}>
                      <EditCompany />
                    </AdminRoute>
                  } 
                />
                <Route 
                  path="companies/:id/users" 
                  element={
                    <AdminRoute requireSuperAdmin={true}>
                      <CompanyUsers />
                    </AdminRoute>
                  } 
                />
                <Route 
                  path="companies/:id/users/create" 
                  element={
                    <AdminRoute requireSuperAdmin={true}>
                      <CreateCompanyUser />
                    </AdminRoute>
                  } 
                />

                {/* Settings */}
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
              </Router>
              <Toaster position="top-right" />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
  )
}

export default App

