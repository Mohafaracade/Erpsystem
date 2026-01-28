# Invoice Management System - Frontend

A modern React frontend for the Invoice Management System built with Vite, React Router, and Tailwind CSS.

## Features

- 🚀 Fast development with Vite
- 🎨 Modern UI with Tailwind CSS
- 🔐 Authentication & Authorization
- 📱 Responsive Design
- 📊 Dashboard with Analytics
- 🧾 Invoice Management
- 👥 Customer Management
- 📦 Item Management
- 💰 Expense Tracking
- 📈 Reports & Analytics
- 👤 User Management (Admin)

## Tech Stack

- **React 18** - UI Library
- **Vite** - Build Tool
- **React Router** - Routing
- **React Query** - Data Fetching
- **Axios** - HTTP Client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Charts
- **React Hot Toast** - Notifications

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Invoice Management System
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
client/
├── src/
│   ├── components/       # Reusable components
│   │   ├── layout/       # Layout components
│   │   └── routing/      # Route guards
│   ├── contexts/         # React Context providers
│   ├── pages/            # Page components
│   │   ├── auth/        # Authentication pages
│   │   ├── invoices/    # Invoice pages
│   │   ├── customers/   # Customer pages
│   │   ├── items/       # Item pages
│   │   ├── receipts/    # Receipt pages
│   │   ├── expenses/    # Expense pages
│   │   ├── reports/     # Report pages
│   │   └── users/       # User pages
│   ├── services/         # API services
│   │   └── api/         # API client and services
│   ├── utils/           # Utility functions
│   ├── hooks/           # Custom React hooks
│   ├── constants/       # Constants
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend communicates with the backend API through services in `src/services/api/`. All API calls are handled by Axios with automatic token injection and error handling.

## Authentication

Authentication is handled through JWT tokens stored in localStorage. The `AuthContext` provides authentication state and methods throughout the app.

## Routing

Protected routes are wrapped with the `PrivateRoute` component which checks authentication status before rendering.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT

