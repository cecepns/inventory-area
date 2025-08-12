import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Plus, TrendingUp, TrendingDown, 
  RotateCcw, Calendar, Package, ArrowUpDown, Download,
  Eye, Trash2, Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const InventoryMovementsPage = () => {
  const { token, isAdmin } = useAuth();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    product_id: '',
    movement_type: '',
    start_date: '',
    end_date: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 50,
    total: 0,
    total_pages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMovements();
    fetchProducts();
  }, [filters, pagination.current_page]);

  const fetchMovements = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: pagination.current_page,
        limit: pagination.per_page,
        ...filters
      });

      const response = await fetch(`https://api-inventory.isavralabel.com/api/inventory-area/stock-movements?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements);
        setPagination(data.pagination);
      } else {
        toast.error('Failed to fetch movements');
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, current_page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      product_id: '',
      movement_type: '',
      start_date: '',
      end_date: ''
    });
    setSearchTerm('');
  };

  const handleDeleteMovement = async (id) => {
    if (!isAdmin()) {
      toast.error('Admin access required');
      return;
    }

    toast((t) => (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          <span className="font-medium">Confirm Deletion</span>
        </div>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this stock movement?
          <br />
          <span className="text-red-600">This will reverse the stock change and cannot be undone.</span>
        </p>
        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete();
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      style: { maxWidth: '400px' }
    });

    const performDelete = async () => {
      try {
        const response = await fetch(`https://api-inventory.isavralabel.com/api/inventory-area/stock-movements/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchMovements();
          toast.success('Movement deleted successfully');
        } else {
          const data = await response.json();
          toast.error(data.error || 'Failed to delete movement');
        }
      } catch (error) {
        console.error('Error deleting movement:', error);
        toast.error('Network error occurred');
      }
    };
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'adjustment':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      default:
        return <ArrowUpDown className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementColor = (type) => {
    switch (type) {
      case 'in':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'out':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'adjustment':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredMovements = movements.filter(movement => {
    if (!searchTerm) return true;
    return (
      movement.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
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
          <p className="text-gray-600 font-medium">Loading movements...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div 
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Inventory Movements</h2>
          <p className="text-gray-600 mt-1">Track all stock movements and transactions</p>
        </div>
        <div className="flex space-x-3">
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Movement</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search movements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Product Filter */}
          <select
            value={filters.product_id}
            onChange={(e) => handleFilterChange('product_id', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">All Products</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>

          {/* Movement Type Filter */}
          <select
            value={filters.movement_type}
            onChange={(e) => handleFilterChange('movement_type', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">All Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="adjustment">Adjustment</option>
          </select>

          {/* Date Filters */}
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        {/* Filter Actions */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Showing {filteredMovements.length} of {pagination.total} movements
          </p>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
          >
            <Filter className="w-4 h-4" />
            <span>Clear filters</span>
          </button>
        </div>
      </motion.div>

      {/* Movements Table */}
      <motion.div 
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Movement</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <AnimatePresence>
                {filteredMovements.map((movement, index) => (
                  <motion.tr
                    key={movement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {getMovementIcon(movement.movement_type)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">#{movement.id}</div>
                          {movement.notes && (
                            <div className="text-xs text-gray-500 truncate max-w-32">{movement.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{movement.product_name}</div>
                        <div className="text-sm text-gray-500">SKU: {movement.product_sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getMovementColor(movement.movement_type)}`}>
                        {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{movement.quantity}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{movement.reference_number || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {format(new Date(movement.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(movement.created_at), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{movement.created_by}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {isAdmin() && (
                          <motion.button
                            onClick={() => handleDeleteMovement(movement.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Delete Movement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredMovements.length === 0 && (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No movements found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || Object.values(filters).some(v => v) 
                  ? "Try adjusting your search or filter criteria."
                  : "No stock movements have been recorded yet."
                }
              </p>
            </motion.div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {pagination.current_page} of {pagination.total_pages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, current_page: pagination.current_page - 1 })}
                disabled={pagination.current_page === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, current_page: pagination.current_page + 1 })}
                disabled={pagination.current_page === pagination.total_pages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Create Movement Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateMovementModal
            products={products}
            onClose={() => setShowCreateModal(false)}
            onSave={() => {
              fetchMovements();
              setShowCreateModal(false);
            }}
            token={token}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Create Movement Modal Component
const CreateMovementModal = ({ products, onClose, onSave, token }) => {
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'in',
    quantity: '',
    reference_number: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/stock-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity)
        })
      });

      if (response.ok) {
        toast.success('Stock movement created successfully!');
        onSave();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create movement');
      }
    } catch (error) {
      console.error('Error creating movement:', error);
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl max-w-md w-full p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Create Stock Movement</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
            <select
              value={formData.movement_type}
              onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="PO-001, SO-001, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Movement'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default InventoryMovementsPage; 