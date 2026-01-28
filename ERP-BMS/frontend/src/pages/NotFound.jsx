import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-6 transition-colors">
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-black text-gray-200 dark:text-slate-900 mb-4 animate-pulse">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-4">Page Not Found</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-8 font-medium">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link
          to="/dashboard"
          className="btn-primary inline-flex items-center px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary-500/30 hover:scale-[1.05] transition-all"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFound
