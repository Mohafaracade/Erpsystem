# Invoice Management System (IMS) - Backend

A comprehensive Invoice Management System built with MERN stack (MongoDB, Express.js, React.js, Node.js).

## Features

### 1. Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Accountant, Staff)
- Password reset functionality
- Activity logging
- Session management

### 2. Customer Management
- Individual & Business customers
- Complete CRUD operations
- Search and filtering
- Customer analytics

### 3. Item Management
- Product/Service catalog
- Inventory tracking
- Price management
- Tax configuration

### 4. Invoice Management
- Generate invoices
- Multiple payment terms
- Tax calculations
- Invoice templates
- PDF generation

### 5. Sales Receipts
- Record sales
- Multiple payment methods
- Receipt generation

### 6. Expense Tracking
- Categorized expenses
- Receipt upload
- Expense reports
- Approval workflow

### 7. Reports
- Financial reports
- Tax reports
- Customer statements
- Inventory reports
- Export to PDF/Excel

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File uploads
- **PDFKit** - PDF generation
- **Express Validator** - Input validation

### Frontend (Coming Soon)
- **React.js** - UI library
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Query** - Data fetching

## Project Structure

\\\
server/
+-- config/           # Configuration files
+-- controllers/      # Route controllers
+-- middleware/       # Custom middleware
+-- models/           # Mongoose models
+-- routes/           # API routes
+-- utils/            # Utility functions
+-- uploads/          # File uploads
+-- .env              # Environment variables
+-- .gitignore        # Git ignore file
+-- package.json      # Dependencies
+-- server.js         # Entry point
\\\

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   \\\ash
   git clone <repository-url>
   cd invoice-management-system/server
   \\\

2. **Install dependencies**
   \\\ash
   npm install
   \\\

3. **Set up environment variables**
   \\\ash
   cp .env.example .env
   # Edit .env with your configuration
   \\\

4. **Start MongoDB**
   \\\ash
   # Make sure MongoDB is running
   mongod
   \\\

5. **Run the application**
   \\\ash
   # Development
   npm run dev

   # Production
   npm start
   \\\

## API Documentation

### Base URL
\http://localhost:5000/api\

### Authentication Endpoints
- \POST /api/auth/register\ - Register new user
- \POST /api/auth/login\ - User login
- \POST /api/auth/logout\ - User logout
- \POST /api/auth/forgot-password\ - Forgot password
- \POST /api/auth/reset-password\ - Reset password

### Customer Endpoints
- \GET /api/customers\ - Get all customers
- \GET /api/customers/:id\ - Get single customer
- \POST /api/customers\ - Create customer
- \PUT /api/customers/:id\ - Update customer
- \DELETE /api/customers/:id\ - Delete customer
- \GET /api/customers/search?q=\ - Search customers

### Invoice Endpoints
- \GET /api/invoices\ - Get all invoices
- \GET /api/invoices/:id\ - Get single invoice
- \POST /api/invoices\ - Create invoice
- \PUT /api/invoices/:id\ - Update invoice
- \DELETE /api/invoices/:id\ - Delete invoice
- \GET /api/invoices/:id/pdf\ - Download PDF invoice

## Environment Variables

Create a \.env\ file in the root directory with the following:

\\\
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ims_database

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d

# Password Reset
RESET_TOKEN_EXPIRE=30

# File Uploads
MAX_FILE_SIZE=5
UPLOAD_PATH=./uploads

# Security
CORS_ORIGIN=http://localhost:3000

# Session
SESSION_TIMEOUT=3600000
\\\

## Scripts

- \
pm run dev\ - Start development server with nodemon
- \
pm start\ - Start production server
- \
pm test\ - Run tests (to be implemented)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
