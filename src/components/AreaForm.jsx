import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

const AreaForm = ({ area, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'area',
    x: 0,
    y: 0,
    width: 80,
    height: 60,
    color: '#3b82f6'
  });

  const areaTypes = [
    { value: 'area', label: 'Storage Area', icon: '🏪' },
    { value: 'aisle', label: 'Aisle/Path', icon: '🛤️' },
    { value: 'door', label: 'Door/Entry', icon: '🚪' },
    { value: 'office', label: 'Office Area', icon: '🏢' }
  ];

  const colorOptions = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ef4444', label: 'Red' },
    { value: '#6b7280', label: 'Gray' }
  ];

  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name || '',
        type: area.type || 'area',
        x: area.x || 0,
        y: area.y || 0,
        width: area.width || 80,
        height: area.height || 60,
        color: area.color || '#3b82f6'
      });
    }
  }, [area]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = area && area.id
        ? `https://api-inventory.isavralabel.com/api/inventory-area/warehouse/areas/${area.id}`
        : 'https://api-inventory.isavralabel.com/api/inventory-area/warehouse/areas';
      
      const method = area && area.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          area && area.id ? 'Area updated successfully!' : 'Area created successfully!',
          { icon: area && area.id ? '✏️' : '✨' }
        );
        onSave();
      } else {
        const errorData = await response.json();
        toast.error(`Error saving area: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving area:', error);
      toast.error('Network error occurred. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'x' || name === 'y' || name === 'width' || name === 'height' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {area && area.id ? 'Edit Area' : 'Create New Area'}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area Name *
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
                Area Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="select-field"
                required
              >
                {areaTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X Position
                </label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  min="0"
                  step="20"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Y Position
                </label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  min="0"
                  step="20"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleChange}
                  min="20"
                  step="20"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  min="20"
                  step="20"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex space-x-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`w-8 h-8 rounded border-2 ${
                      formData.color === color.value ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="mt-2 w-full h-8 border border-gray-300 rounded"
              />
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
                {area && area.id ? 'Update' : 'Create'} Area
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

AreaForm.propTypes = {
  area: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default AreaForm;