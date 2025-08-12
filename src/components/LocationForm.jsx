import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

const LocationForm = ({ location, areas, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    area_id: '',
    row_number: 1,
    column_number: 1,
    location_code: '',
    capacity: 100
  });

  useEffect(() => {
    if (location) {
      setFormData({
        area_id: location.area_id || '',
        row_number: location.row_number || 1,
        column_number: location.column_number || 1,
        location_code: location.location_code || '',
        capacity: location.capacity || 100
      });
    }
  }, [location]);

  // Auto-generate location code when area, row, or column changes
  useEffect(() => {
    if (formData.area_id && formData.row_number && formData.column_number) {
      const selectedArea = areas.find(area => area.id === parseInt(formData.area_id));
      if (selectedArea) {
        // Generate code like "A1-1", "B2-3", "LD1-2"
        let areaPrefix = selectedArea.name.charAt(0).toUpperCase();
        
        // Special cases for common area names
        if (selectedArea.name.toLowerCase().includes('loading dock')) {
          areaPrefix = 'LD';
        } else if (selectedArea.name.toLowerCase().includes('office')) {
          areaPrefix = 'OF';
        } else if (selectedArea.name.toLowerCase().includes('area a')) {
          areaPrefix = 'A';
        } else if (selectedArea.name.toLowerCase().includes('area b')) {
          areaPrefix = 'B';
        }
        
        const newLocationCode = `${areaPrefix}${formData.row_number}-${formData.column_number}`;
        if (formData.location_code !== newLocationCode) {
          setFormData(prev => ({ ...prev, location_code: newLocationCode }));
        }
      }
    }
  }, [formData.area_id, formData.row_number, formData.column_number, areas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.area_id) {
      toast.error('Please select an area');
      return;
    }
    
    if (!formData.location_code.trim()) {
      toast.error('Location code is required');
      return;
    }
    
    try {
      const url = location && location.id
        ? `https://api-inventory.isavralabel.com/api/inventory-area/warehouse/locations/${location.id}`
        : 'https://api-inventory.isavralabel.com/api/inventory-area/warehouse/locations';
      
      const method = location && location.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          location && location.id ? 'Location updated successfully!' : 'Location created successfully!',
          { icon: location && location.id ? '✏️' : '✨' }
        );
        onSave();
      } else {
        const errorData = await response.json();
        toast.error(`Error saving location: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Network error occurred. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'area_id' || name === 'row_number' || name === 'column_number' || name === 'capacity'
        ? parseInt(value) || (name === 'capacity' ? 100 : 1)
        : value
    }));
  };

  // Generate bulk locations
  const handleBulkGenerate = () => {
    if (!formData.area_id) {
      toast.error('Please select an area first');
      return;
    }

    // Create a custom toast for bulk generation input
    toast((t) => (
      <div className="flex flex-col space-y-3">
        <span className="font-medium">Bulk Location Generator</span>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const rows = parseInt(formData.get('rows'));
          const columns = parseInt(formData.get('columns'));
          
          if (rows && columns && rows > 0 && columns > 0) {
            toast.dismiss(t.id);
            generateBulkLocations(rows, columns);
          } else {
            toast.error('Please enter valid numbers for rows and columns');
          }
        }} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              name="rows"
              type="number"
              placeholder="Rows"
              defaultValue="3"
              min="1"
              max="50"
              className="px-2 py-1 border rounded text-sm"
              required
            />
            <input
              name="columns"
              type="number"
              placeholder="Columns"
              defaultValue="3"
              min="1"
              max="50"
              className="px-2 py-1 border rounded text-sm"
              required
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    ), {
      duration: Infinity,
      style: { maxWidth: '300px' }
    });
  };

  const generateBulkLocations = async (rows, columns) => {
    const selectedArea = areas.find(area => area.id === parseInt(formData.area_id));
    if (!selectedArea) return;

    let areaPrefix = selectedArea.name.charAt(0).toUpperCase();
    
    // Special cases for common area names
    if (selectedArea.name.toLowerCase().includes('loading dock')) {
      areaPrefix = 'LD';
    } else if (selectedArea.name.toLowerCase().includes('office')) {
      areaPrefix = 'OF';
    } else if (selectedArea.name.toLowerCase().includes('area a')) {
      areaPrefix = 'A';
    } else if (selectedArea.name.toLowerCase().includes('area b')) {
      areaPrefix = 'B';
    }

    try {
      const locations = [];
      for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= columns; col++) {
          locations.push({
            area_id: formData.area_id,
            row_number: row,
            column_number: col,
            location_code: `${areaPrefix}${row}-${col}`,
            capacity: formData.capacity
          });
        }
      }

      // Create all locations
      const promises = locations.map(loc => 
        fetch('https://api-inventory.isavralabel.com/api/inventory-area/warehouse/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loc)
        })
      );

      await Promise.all(promises);
      toast.success(`Successfully created ${locations.length} locations!`, {
        icon: '🏗️',
        duration: 4000
      });
      onSave();
          } catch (error) {
        console.error('Error creating bulk locations:', error);
        toast.error('Network error while creating bulk locations. Please try again.');
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {location && location.id ? 'Edit Location' : 'Create New Location'}
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
                Area *
              </label>
              <select
                name="area_id"
                value={formData.area_id}
                onChange={handleChange}
                className="select-field"
                required
              >
                <option value="">Select Area</option>
                {areas.filter(area => area.type === 'area').map(area => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Only storage areas can contain locations
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Row Number *
                </label>
                <input
                  type="number"
                  name="row_number"
                  value={formData.row_number}
                  onChange={handleChange}
                  min="1"
                  max="99"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Column Number *
                </label>
                <input
                  type="number"
                  name="column_number"
                  value={formData.column_number}
                  onChange={handleChange}
                  min="1"
                  max="99"
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Code *
              </label>
              <input
                type="text"
                name="location_code"
                value={formData.location_code}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., A1-1, B2-3, LD1-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-generated based on area and position
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum items this location can hold
              </p>
            </div>

            {!location && (
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={handleBulkGenerate}
                  className="w-full btn-secondary mb-2"
                >
                  🚀 Bulk Generate Locations
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Generate multiple locations at once (e.g., 3x3 grid)
                </p>
              </div>
            )}

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
                {location && location.id ? 'Update' : 'Create'} Location
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

LocationForm.propTypes = {
  location: PropTypes.object,
  areas: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default LocationForm; 