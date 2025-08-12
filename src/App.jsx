import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import PropTypes from 'prop-types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthLayout from './components/AuthLayout';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import WarehousePage from './pages/WarehousePage';
import InventoryMovementsPage from './pages/InventoryMovementsPage';
import UserManagementPage from './pages/UserManagementPage';
import ReportsPage from './pages/ReportsPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600 font-medium">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthLayout />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Layout component to handle animations
const AppLayout = ({ children }) => {
  const location = useLocation();
  
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.3
  };

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return 'Dashboard';
      case '/products':
        return 'Product Management';
      case '/inventory-movements':
        return 'Inventory Movements';
      case '/warehouse':
        return 'Warehouse Layout';
      case '/reports':
        return 'Reports';
      case '/users':
        return 'User Management';
      default:
        return 'Warehouse Management System';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <motion.header 
          className="bg-white shadow-sm border-b border-gray-200 px-6 py-4"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-semibold text-gray-900">
            {getPageTitle(location.pathname)}
          </h1>
        </motion.header>
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            maxWidth: '500px',
          },
          success: {
            style: {
              border: '1px solid #10b981',
              background: '#ecfdf5',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            style: {
              border: '1px solid #ef4444',
              background: '#fef2f2',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute>
              <AppLayout>
                <ProductsPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/inventory-movements" element={
            <ProtectedRoute>
              <AppLayout>
                <InventoryMovementsPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/warehouse" element={
            <ProtectedRoute>
              <AppLayout>
                <WarehousePage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <AppLayout>
                <ReportsPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <AppLayout>
                <UserManagementPage />
              </AppLayout>
            </ProtectedRoute>
          } />
          {/* Fallback route */}
          <Route path="*" element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;