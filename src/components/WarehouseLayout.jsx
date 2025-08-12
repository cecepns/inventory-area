import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { AlertTriangle, MapPin } from 'lucide-react';
import WarehouseCanvas from './WarehouseCanvas';
import AreaForm from './AreaForm';
import LocationForm from './LocationForm';

const WarehouseLayout = ({ selectedAreaId, onAreaSelect }) => {
  const [areas, setAreas] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editArea, setEditArea] = useState(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editLocation, setEditLocation] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    fetchAreas();
    fetchLocations();
  }, []);

  const fetchAreas = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/warehouse/areas');
      const data = await response.json();
      setAreas(data);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/warehouse/locations');
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleDeleteArea = async (id) => {
    const area = areas.find(a => a.id === id);
    const areaName = area?.name || 'this area';
    
    // Use a custom confirmation toast instead of window.confirm
    toast((t) => (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="font-medium">Confirm Area Deletion</span>
        </div>
        <p className="text-sm text-gray-600">
          Are you sure you want to permanently delete <strong>&quot;{areaName}&quot;</strong>?
          <br />
          <span className="text-red-600">This will also delete all locations in this area and cannot be undone.</span>
        </p>
        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performAreaDelete();
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete Area
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

    const performAreaDelete = async () => {
      try {
        const response = await fetch(`https://api-inventory.isavralabel.com/api/inventory-area/warehouse/areas/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          const result = await response.json();
          fetchAreas();
          fetchLocations();
          
          if (result.deletedLocations > 0) {
            toast.success(`Area "${areaName}" deleted successfully! ${result.deletedLocations} locations were also removed.`, {
              icon: '🗑️',
              duration: 4000,
            });
          } else {
            toast.success(`Area "${areaName}" deleted successfully!`, {
              icon: '🗑️',
            });
          }
        } else {
          const errorData = await response.json();
          toast.error(`Cannot delete area: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error deleting area:', error);
        toast.error('Error deleting area. Please try again.');
      }
    };
  };

  const handleEditArea = (area) => {
    setEditArea(area);
    setShowForm(true);
  };

  const handleDeleteLocation = async (id) => {
    const location = locations.find(l => l.id === id);
    const locationCode = location?.location_code || 'this location';
    
    // Use a custom confirmation toast instead of window.confirm
    toast((t) => (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-red-500" />
          <span className="font-medium">Confirm Location Deletion</span>
        </div>
        <p className="text-sm text-gray-600">
          Are you sure you want to permanently delete location <strong>&quot;{locationCode}&quot;</strong>?
          <br />
          <span className="text-red-600">This action cannot be undone.</span>
        </p>
        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performLocationDelete();
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete Location
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

    const performLocationDelete = async () => {
      try {
        const response = await fetch(`https://api-inventory.isavralabel.com/api/inventory-area/warehouse/locations/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchLocations();
          toast.success(`Location "${locationCode}" deleted successfully!`, {
            icon: '📍',
          });
        } else {
          const errorData = await response.json();
          toast.error(`Cannot delete location: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error deleting location:', error);
        toast.error('Error deleting location. Please try again.');
      }
    };
  };

  const handleEditLocation = (location) => {
    setEditLocation(location);
    setShowLocationForm(true);
  };

  const handleCanvasClick = (position) => {
    if (!selectedArea) return;
    
    // Create new area at clicked position
    const newArea = {
      name: `New ${selectedArea.charAt(0).toUpperCase() + selectedArea.slice(1)}`,
      type: selectedArea,
      x: Math.round(position.x / 20) * 20, // Snap to grid
      y: Math.round(position.y / 20) * 20,
      width: selectedArea === 'aisle' ? 40 : 80,
      height: selectedArea === 'aisle' ? 200 : 60,
      color: getAreaColor(selectedArea)
    };
    
    setEditArea(newArea);
    setShowForm(true);
  };

  const getAreaColor = (type) => {
    switch (type) {
      case 'area': return '#3b82f6';
      case 'aisle': return '#6b7280';
      case 'door': return '#f59e0b';
      case 'office': return '#8b5cf6';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Warehouse Layout</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setEditLocation(null);
              setShowLocationForm(true);
            }}
            className="btn-secondary"
          >
            📍 Add Location
          </button>
          <button
            onClick={() => {
              setEditArea(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            🏪 Add Area
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tools Panel */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Drawing Tools</h3>
            <div className="space-y-2">
              {[
                { type: 'area', label: 'Storage Area', icon: '🏪', color: '#3b82f6' },
                { type: 'aisle', label: 'Aisle/Path', icon: '🛤️', color: '#6b7280' },
                { type: 'door', label: 'Door/Entry', icon: '🚪', color: '#f59e0b' },
                { type: 'office', label: 'Office Area', icon: '🏢', color: '#8b5cf6' }
              ].map(tool => (
                <button
                  key={tool.type}
                  onClick={() => setSelectedArea(selectedArea === tool.type ? null : tool.type)}
                  className={`w-full flex items-center p-3 text-left rounded-lg border-2 transition-colors ${
                    selectedArea === tool.type 
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-2xl mr-3">{tool.icon}</span>
                  <div>
                    <div className="font-medium">{tool.label}</div>
                    <div className="flex items-center mt-1">
                      <div 
                        className="w-4 h-4 rounded mr-2"
                        style={{ backgroundColor: tool.color }}
                      ></div>
                      <span className="text-xs text-gray-500">{tool.color}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {selectedArea && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Selected:</strong> {selectedArea.charAt(0).toUpperCase() + selectedArea.slice(1)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Click on the canvas to place this element
                </p>
              </div>
            )}
          </div>

          {/* Areas List */}
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas ({areas.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {areas.map(area => (
                <div 
                  key={area.id} 
                  className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors ${
                    selectedAreaId === area.id 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onAreaSelect && onAreaSelect(area.id)}
                >
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-2"
                      style={{ backgroundColor: area.color }}
                    ></div>
                    <div>
                      <div className={`text-sm font-medium ${selectedAreaId === area.id ? 'text-primary-700' : ''}`}>
                        {area.name}
                      </div>
                      <div className="text-xs text-gray-500">{area.type}</div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditArea(area);
                      }}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteArea(area.id);
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Locations List */}
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Locations ({locations.length})</h3>
              <button
                onClick={() => {
                  setEditLocation(null);
                  setShowLocationForm(true);
                }}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {locations.map(location => (
                <div key={location.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <div>
                      <div className="text-sm font-medium">{location.location_code}</div>
                      <div className="text-xs text-gray-500">
                        {location.area_name} | R{location.row_number}-C{location.column_number} | Cap: {location.capacity}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditLocation(location)}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {locations.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No locations yet</p>
                  <p className="text-xs">Create areas first, then add locations to them</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Warehouse Layout</h3>
              <div className="text-sm text-gray-600">
                Grid: 20px | Canvas: {canvasSize.width} x {canvasSize.height}
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-auto bg-gray-50">
              <WarehouseCanvas
                areas={areas}
                onAreaClick={handleEditArea}
                onCanvasClick={handleCanvasClick}
                selectedTool={selectedArea}
                width={canvasSize.width}
                height={canvasSize.height}
                selectedAreaId={selectedAreaId}
              />
            </div>

            {/* Canvas Controls */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCanvasSize(prev => ({ ...prev, width: prev.width + 100 }))}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Expand Width
                </button>
                <button
                  onClick={() => setCanvasSize(prev => ({ ...prev, height: prev.height + 100 }))}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Expand Height
                </button>
              </div>
              <div className="text-sm text-gray-600">
                {areas.length} areas • {locations.length} locations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Area Form Modal */}
      {showForm && (
        <AreaForm
          area={editArea}
          onClose={() => {
            setShowForm(false);
            setEditArea(null);
          }}
          onSave={() => {
            fetchAreas();
            fetchLocations();
            setShowForm(false);
            setEditArea(null);
          }}
        />
      )}

      {/* Location Form Modal */}
      {showLocationForm && (
        <LocationForm
          location={editLocation}
          areas={areas}
          onClose={() => {
            setShowLocationForm(false);
            setEditLocation(null);
          }}
          onSave={() => {
            fetchLocations();
            setShowLocationForm(false);
            setEditLocation(null);
          }}
        />
      )}
    </div>
  );
};

WarehouseLayout.propTypes = {
  selectedAreaId: PropTypes.number,
  onAreaSelect: PropTypes.func,
};

export default WarehouseLayout;