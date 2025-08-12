import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

const ProductForm = ({ product, categories, locations, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    min_stock: 0,
    max_stock: 1000,
    unit_price: 0,
    expiration_date: '',
    location_id: '',
    manual_row: '',
    manual_column: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id || '',
        min_stock: product.min_stock || 0,
        max_stock: product.max_stock || 1000,
        unit_price: product.unit_price || 0,
        expiration_date: product.expiration_date ? product.expiration_date.split('T')[0] : '',
        location_id: product.location_id || '',
        manual_row: product.manual_row || '',
        manual_column: product.manual_column || ''
      });
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = product 
        ? `https://api-inventory.isavralabel.com/api/inventory-area/products/${product.id}`
        : 'https://api-inventory.isavralabel.com/api/inventory-area/products';
      
      const method = product ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          product ? 'Product updated successfully!' : 'Product created successfully!',
          { icon: product ? '✏️' : '✨' }
        );
        onSave();
      } else {
        const errorData = await response.json();
        toast.error(`Error saving product: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Network error occurred. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {product ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="select-field"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price
                </label>
                <input
                  type="number"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  name="expiration_date"
                  value={formData.expiration_date}
                  onChange={handleChange}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for non-perishable items
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Stock
                </label>
                <input
                  type="number"
                  name="min_stock"
                  value={formData.min_stock}
                  onChange={handleChange}
                  min="0"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Stock
                </label>
                <input
                  type="number"
                  name="max_stock"
                  value={formData.max_stock}
                  onChange={handleChange}
                  min="0"
                  className="input-field"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Location Assignment</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Predefined Location
                </label>
                <select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleChange}
                  className="select-field"
                >
                  <option value="">Select Location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.location_code} - {location.area_name} (R{location.row_number}-C{location.column_number})
                    </option>
                  ))}
                </select>
                {locations.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    ⚠️ No predefined locations available. Please set up warehouse areas and locations first, or use manual row/column.
                  </p>
                )}
                {locations.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    💡 Click on location in product list to navigate to warehouse layout
                  </p>
                )}
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">OR</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manual Row
                  </label>
                  <input
                    type="number"
                    name="manual_row"
                    value={formData.manual_row}
                    onChange={handleChange}
                    min="1"
                    className="input-field"
                    placeholder="Row number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manual Column
                  </label>
                  <input
                    type="number"
                    name="manual_column"
                    value={formData.manual_column}
                    onChange={handleChange}
                    min="1"
                    className="input-field"
                    placeholder="Column number"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {product ? 'Update' : 'Create'} Product
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

ProductForm.propTypes = {
  product: PropTypes.object,
  categories: PropTypes.array.isRequired,
  locations: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default ProductForm;