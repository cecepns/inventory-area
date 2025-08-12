import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  DollarSign, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0,
    recentMovements: [],
    stockByCategory: [],
    warehouseUtilization: []
  });
  const [loading, setLoading] = useState(true);
  const [animationsComplete, setAnimationsComplete] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Force animations to complete after a delay as fallback
    const animationTimer = setTimeout(() => {
      setAnimationsComplete(true);
    }, 1000);
    
    return () => clearTimeout(animationTimer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/dashboard/stats');
      const data = await response.json();
      setStats(data);
      setLoading(false);
      // Trigger animations immediately when data loads
      setTimeout(() => setAnimationsComplete(true), 100);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
      setAnimationsComplete(true);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStock,
      icon: AlertTriangle,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStock,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200'
    }
  ];

  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );

  const SkeletonTable = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={`skeleton-row-${i}`} className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[...Array(4)].map((_, i) => (
             <SkeletonCard key={`skeleton-card-${i}`} />
           ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonTable />
          <SkeletonTable />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={animationsComplete ? { opacity: 1 } : {}}
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Welcome back! Here&apos;s what&apos;s happening with your warehouse.</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
              }}
              className={`bg-white rounded-xl border ${card.borderColor} p-6 transition-all duration-200 hover:shadow-lg`}
              style={animationsComplete ? { opacity: 1, transform: 'translateY(0px)' } : {}}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <motion.p 
                    className="text-2xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                  >
                    {card.value}
                  </motion.p>
                </div>
                <motion.div 
                  className={`${card.bgColor} p-3 rounded-lg`}
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                >
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Stock Movements */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Stock Movements</h3>
            </div>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {stats.recentMovements.length > 0 ? (
                stats.recentMovements.slice(0, 5).map((movement, index) => (
                  <motion.div
                    key={`movement-${movement.id || index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-full ${
                        movement.movement_type === 'in' 
                          ? 'bg-green-100' 
                          : movement.movement_type === 'out' 
                          ? 'bg-red-100' 
                          : 'bg-blue-100'
                      }`}>
                        {movement.movement_type === 'in' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : movement.movement_type === 'out' ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{movement.product_name}</p>
                        <p className="text-xs text-gray-500">
                          {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                          {movement.quantity} • {formatDate(movement.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      movement.movement_type === 'in' 
                        ? 'text-green-600' 
                        : movement.movement_type === 'out' 
                        ? 'text-red-600' 
                        : 'text-blue-600'
                    }`}>
                      {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                      {movement.quantity}
                    </span>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No recent stock movements</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Stock by Category */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PieChart className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Stock by Category</h3>
            </div>
          </div>
          
                    <div className="space-y-4">
            <AnimatePresence mode="wait">
              {stats.stockByCategory.length > 0 ? (
                stats.stockByCategory.map((category, index) => (
                  <motion.div
                    key={`category-${category.category_name || index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {category.category_name || 'Uncategorized'}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {category.total_stock}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${Math.min((category.total_stock / Math.max(...stats.stockByCategory.map(c => c.total_stock))) * 100, 100)}%` 
                        }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                      />
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <PieChart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No categories found</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Warehouse Utilization */}
      {stats.warehouseUtilization.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Warehouse Utilization</h3>
            </div>
          </div>
          
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="wait">
              {stats.warehouseUtilization.map((area, index) => (
                <motion.div
                  key={`warehouse-area-${area.area_name || index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{area.area_name}</h4>
                    <span className="text-xs text-gray-500">
                      {area.used_locations}/{area.total_locations}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <motion.div
                                             className={`h-2 rounded-full ${
                         (area.utilization_percentage || 0) > 80 
                           ? 'bg-gradient-to-r from-red-500 to-red-600' 
                           : (area.utilization_percentage || 0) > 60 
                           ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' 
                           : 'bg-gradient-to-r from-green-500 to-green-600'
                       }`}
                      initial={{ width: 0 }}
                                             animate={{ width: `${Number(area.utilization_percentage || 0)}%` }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                    />
                  </div>
                                                       <p className="text-xs text-gray-600">
                    {Number(area.utilization_percentage || 0).toFixed(1)}% utilized
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;