import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Filter, Plus, Edit2, Package, Trash2, MapPin } from 'lucide-react';
import ProductForm from './ProductForm';
import StockMovementModal from './StockMovementModal';

const ProductManagement = ({ onLocationClick }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchLocations();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/products');
      const data = await response.json();
      setProducts(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products. Please try again.');
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories.');
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/warehouse/locations');
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to fetch locations.');
    }
  };

  const handleDeleteProduct = async (id) => {
    const product = products.find(p => p.id === id);
    const productName = product?.name || 'this product';
    
    // Use a custom confirmation toast instead of window.confirm
    toast((t) => (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          <span className="font-medium">Confirm Deletion</span>
        </div>
                 <p className="text-sm text-gray-600">
           Are you sure you want to permanently delete <strong>&quot;{productName}&quot;</strong>?
           <br />
           <span className="text-red-600">This will also delete all stock movement history and cannot be undone.</span>
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
      style: {
        maxWidth: '400px',
      }
    });

    const performDelete = async () => {
      try {
        const response = await fetch(`https://api-inventory.isavralabel.com/api/inventory-area/products/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchProducts();
          toast.success(`Product "${productName}" deleted successfully!`, {
            icon: '🗑️',
          });
        } else {
          const errorData = await response.json();
          toast.error(`Cannot delete product: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Error deleting product. Please try again.');
      }
    };
  };

  const handleEditProduct = (product) => {
    setEditProduct(product);
    setShowForm(true);
  };

  const handleStockMovement = (product) => {
    setSelectedProduct(product);
    setShowStockModal(true);
  };

  const handleLocationClick = (product) => {
    if (product.area_id && onLocationClick) {
      onLocationClick(product.area_id);
      toast.success(`Navigating to ${product.location_code || 'product location'}`, {
        icon: '🗺️',
      });
    } else {
      toast.error('No location assigned to this product');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category_id === parseInt(filterCategory);
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (currentStock, minStock) => {
    if (currentStock === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-50 border-red-200' };
    if (currentStock <= minStock) return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-50 border-green-200' };
  };

  const getExpiryStatus = (expirationDate) => {
    if (!expirationDate) return { status: 'No Expiry', color: 'text-gray-600 bg-gray-50 border-gray-200' };
    
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'Expired', color: 'text-red-600 bg-red-50 border-red-200' };
    if (daysUntilExpiry <= 30) return { status: 'Critical', color: 'text-red-600 bg-red-50 border-red-200' };
    if (daysUntilExpiry <= 90) return { status: 'Near Expiry', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    if (daysUntilExpiry <= 180) return { status: 'Warning', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return { status: 'Good', color: 'text-green-600 bg-green-50 border-green-200' };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 300
      }
    }
  };

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
          <p className="text-gray-600 font-medium">Loading products...</p>
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
          <h2 className="text-3xl font-bold text-gray-900">Product Management</h2>
          <p className="text-gray-600 mt-1">Manage your inventory products and stock levels</p>
        </div>
        <motion.button
          onClick={() => {
            setEditProduct(null);
            setShowForm(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Product</span>
        </motion.button>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="w-full lg:w-64 relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {(searchTerm || filterCategory) && (
          <motion.div 
            className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-sm text-gray-600">
              Showing {filteredProducts.length} of {products.length} products
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Products Table */}
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiration</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <motion.tbody 
              className="divide-y divide-gray-200"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {filteredProducts.map((product, index) => {
                  const stockStatus = getStockStatus(product.current_stock, product.min_stock);
                  const expiryStatus = getExpiryStatus(product.expiration_date);
                  return (
                    <motion.tr
                      key={product.id}
                      variants={cardVariants}
                      layout
                      className="hover:bg-gray-50 transition-colors duration-150"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {product.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-semibold">{product.current_stock}</div>
                        <div className="text-xs text-gray-500">Min: {product.min_stock}</div>
                      </td>
                      <td className="px-6 py-4">
                        {product.expiration_date ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(product.expiration_date).toLocaleDateString()}
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${expiryStatus.color}`}>
                              {expiryStatus.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No expiry</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {product.location_code ? (
                          <motion.button
                            onClick={() => handleLocationClick(product)}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <MapPin className="w-4 h-4" />
                            <span>{product.location_code}</span>
                          </motion.button>
                        ) : (
                          <span className="text-gray-400 text-sm">No location</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          Rp {product.unit_price.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <motion.button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            onClick={() => handleStockMovement(product)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Update Stock"
                          >
                            <Package className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </motion.tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterCategory 
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by adding your first product."
                }
              </p>
              {!searchTerm && !filterCategory && (
                <motion.button
                  onClick={() => {
                    setEditProduct(null);
                    setShowForm(true);
                  }}
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-5 h-5" />
                  <span>Add First Product</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ProductForm
            product={editProduct}
            categories={categories}
            locations={locations}
            onClose={() => {
              setShowForm(false);
              setEditProduct(null);
            }}
            onSave={() => {
              fetchProducts();
              setShowForm(false);
              setEditProduct(null);
              toast.success(
                editProduct ? 'Product updated successfully!' : 'Product created successfully!',
                { icon: editProduct ? '✏️' : '✨' }
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* Stock Movement Modal */}
      <AnimatePresence>
        {showStockModal && selectedProduct && (
          <StockMovementModal
            product={selectedProduct}
            onClose={() => {
              setShowStockModal(false);
              setSelectedProduct(null);
            }}
            onSave={() => {
              fetchProducts();
              setShowStockModal(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

ProductManagement.propTypes = {
  onLocationClick: PropTypes.func,
};

export default ProductManagement;