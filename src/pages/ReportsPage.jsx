import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, FileText, Filter,
  Package, AlertTriangle, Building2
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  generateStockExcel, 
  generateWarehouseLayoutPDF, 
  generateNearExpiryExcel,
  downloadFile 
} from '../utils/reportGenerators';

const ReportsPage = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const downloadReport = async (reportType, options = {}) => {
    setLoading({ ...loading, [reportType]: true });

    try {
      let data, buffer, filename, contentType;

      switch (reportType) {
        case 'stock-excel':
          // Fetch products data
          const productsResponse = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/products', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!productsResponse.ok) {
            throw new Error('Failed to fetch products data');
          }
          
          data = await productsResponse.json();
          
          // Apply filters
          let filteredProducts = data.filter(product => product.is_active);
          
          if (options.category_id) {
            filteredProducts = filteredProducts.filter(product => product.category_id === parseInt(options.category_id));
          }
          
          if (options.low_stock_only === true) {
            filteredProducts = filteredProducts.filter(product => product.current_stock <= product.min_stock);
          }
          
          // Calculate stock status and expiry status
          const processedProducts = filteredProducts.map(product => ({
            ...product,
            category: product.category_name,
            location_code: product.location_code,
            area_name: product.area_name,
            stock_status: product.current_stock === 0 ? 'Out of Stock' : 
                         product.current_stock <= product.min_stock ? 'Low Stock' : 'In Stock',
            expiry_status: product.expiration_date ? 
              (new Date(product.expiration_date) <= new Date() ? 'Expired' :
               new Date(product.expiration_date) <= new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) ? 'Near Expiry' : 'Good') : 'Good'
          }));
          
          // Calculate summary
          const summary = {
            'Total Products': processedProducts.length,
            'Out of Stock': processedProducts.filter(p => p.stock_status === 'Out of Stock').length,
            'Low Stock': processedProducts.filter(p => p.stock_status === 'Low Stock').length,
            'In Stock': processedProducts.filter(p => p.stock_status === 'In Stock').length,
            'Near Expiry': processedProducts.filter(p => p.expiry_status === 'Near Expiry').length,
            'Expired': processedProducts.filter(p => p.expiry_status === 'Expired').length,
            'Total Stock Value': processedProducts.reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0)
          };
          
          buffer = generateStockExcel(processedProducts, summary);
          filename = `stock_report_${new Date().toISOString().split('T')[0]}.xlsx`;
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;

        case 'near-expiry-excel':
          // Fetch products data
          const nearExpiryResponse = await fetch('https://api-inventory.isavralabel.com/api/inventory-area/products', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!nearExpiryResponse.ok) {
            throw new Error('Failed to fetch products data');
          }
          
          data = await nearExpiryResponse.json();
          
          // Filter products with expiration dates
          const months = parseInt(options.months || 6);
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() + months);
          
          const nearExpiryProducts = data.filter(product => 
            product.is_active && 
            product.expiration_date && 
            new Date(product.expiration_date) <= cutoffDate
          ).map(product => {
            const daysUntilExpiry = Math.ceil((new Date(product.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
            return {
              ...product,
              category: product.category_name,
              location_code: product.location_code,
              area_name: product.area_name,
              days_until_expiry: daysUntilExpiry,
              expiry_status: daysUntilExpiry < 0 ? 'Expired' : 
                           daysUntilExpiry <= 30 ? 'Critical (< 1 month)' :
                           daysUntilExpiry <= 90 ? 'High (< 3 months)' : 'Medium (< 6 months)'
            };
          });
          
          buffer = generateNearExpiryExcel(nearExpiryProducts, months);
          filename = `near_expiry_report_${new Date().toISOString().split('T')[0]}.xlsx`;
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;

        case 'warehouse-layout-pdf':
          // Fetch warehouse areas and locations
          const [areasResponse, locationsResponse] = await Promise.all([
            fetch('https://api-inventory.isavralabel.com/api/inventory-area/warehouse-areas', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }),
            fetch('https://api-inventory.isavralabel.com/api/inventory-area/warehouse-locations', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
          ]);
          
          if (!areasResponse.ok || !locationsResponse.ok) {
            throw new Error('Failed to fetch warehouse data');
          }
          
          const [areas, locations] = await Promise.all([
            areasResponse.json(),
            locationsResponse.json()
          ]);
          
          buffer = generateWarehouseLayoutPDF(areas, locations);
          filename = `warehouse_layout_${new Date().toISOString().split('T')[0]}.pdf`;
          contentType = 'application/pdf';
          break;

        default:
          throw new Error('Unknown report type');
      }

      // Download the generated file
      downloadFile(buffer, filename, contentType);
      toast.success('Report generated and downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setLoading({ ...loading, [reportType]: false });
    }
  };

  const reports = [
    {
      id: 'stock-excel',
      title: 'Stock Report',
      subtitle: 'Complete inventory overview',
      description: 'Comprehensive stock report with current levels, locations, valuations, and stock status for all products.',
      icon: <Package className="w-8 h-8 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200',
      format: 'Excel (.xlsx)',
      options: [
        {
          key: 'category_id',
          label: 'Category Filter',
          type: 'select',
          options: [
            { value: '', label: 'All Categories' },
            ...categories.map(cat => ({ value: cat.id, label: cat.name }))
          ]
        },
        {
          key: 'low_stock_only',
          label: 'Low Stock Only',
          type: 'checkbox'
        }
      ]
    },
    {
      id: 'near-expiry-excel',
      title: 'Near Expiry Report',
      subtitle: 'Products approaching expiration',
      description: 'Report showing products that will expire within the specified timeframe, prioritized by urgency.',
      icon: <AlertTriangle className="w-8 h-8 text-orange-600" />,
      color: 'bg-orange-50 border-orange-200',
      format: 'Excel (.xlsx)',
      options: [
        {
          key: 'months',
          label: 'Months Ahead',
          type: 'select',
          options: [
            { value: '1', label: '1 Month' },
            { value: '3', label: '3 Months' },
            { value: '6', label: '6 Months' },
            { value: '12', label: '12 Months' }
          ],
          default: '6'
        }
      ]
    },
    {
      id: 'warehouse-layout-pdf',
      title: 'Warehouse Layout',
      subtitle: 'Complete warehouse overview',
      description: 'Visual warehouse layout report showing all areas, locations, and their current occupancy status.',
      icon: <Building2 className="w-8 h-8 text-green-600" />,
      color: 'bg-green-50 border-green-200',
      format: 'PDF (.pdf)',
      options: []
    }
  ];

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
          <h2 className="text-3xl font-bold text-gray-900">Reports</h2>
          <p className="text-gray-600 mt-1">Generate and download comprehensive inventory reports</p>
        </div>
      </motion.div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {reports.map((report, index) => (
          <ReportCard
            key={report.id}
            report={report}
            index={index}
            isLoading={loading[report.id]}
            onDownload={(options) => downloadReport(report.id, options)}
          />
        ))}
      </div>

      {/* Info Section */}
      <motion.div 
        className="bg-blue-50 border border-blue-200 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Report Information</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• <strong>Stock Report:</strong> Includes current stock levels, valuations, locations, and stock status for all products</p>
              <p>• <strong>Near Expiry Report:</strong> Shows products approaching expiration with priority levels and risk assessment</p>
              <p>• <strong>Warehouse Layout:</strong> Complete warehouse map with area details and location occupancy</p>
            </div>
            <div className="mt-4 text-xs text-blue-700">
              Reports are generated in real-time with current data. Excel reports include multiple worksheets with detailed data and summaries.
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Report Card Component
const ReportCard = ({ report, index, isLoading, onDownload }) => {
  const [options, setOptions] = useState(() => {
    const initialOptions = {};
    report.options.forEach(option => {
      initialOptions[option.key] = option.default || (option.type === 'checkbox' ? false : '');
    });
    return initialOptions;
  });

  const handleOptionChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleDownload = () => {
    onDownload(options);
  };

  return (
    <motion.div
      className={`bg-white rounded-xl shadow-sm border-2 ${report.color} p-6 hover:shadow-md transition-all duration-200`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${report.color}`}>
            {report.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
            <p className="text-sm text-gray-600">{report.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-4">{report.description}</p>

      {/* Format */}
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-xs font-medium text-gray-500">Format:</span>
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
          {report.format}
        </span>
      </div>

      {/* Options */}
      {report.options.length > 0 && (
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Filter className="w-4 h-4 mr-1" />
            Options
          </h4>
          {report.options.map(option => (
            <div key={option.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {option.label}
              </label>
              {option.type === 'select' ? (
                <select
                  value={options[option.key]}
                  onChange={(e) => handleOptionChange(option.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {option.options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : option.type === 'checkbox' ? (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options[option.key]}
                    onChange={(e) => handleOptionChange(option.key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-xs text-gray-600">Include only low stock items</span>
                </div>
              ) : (
                <input
                  type={option.type}
                  value={options[option.key]}
                  onChange={(e) => handleOptionChange(option.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Download Button */}
      <motion.button
        onClick={handleDownload}
        disabled={isLoading}
        className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: isLoading ? 1 : 0.98 }}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Generating...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Download Report</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
};

ReportCard.propTypes = {
  report: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.element.isRequired,
    color: PropTypes.string.isRequired,
    format: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      options: PropTypes.array,
      default: PropTypes.string
    })).isRequired
  }).isRequired,
  index: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
  onDownload: PropTypes.func.isRequired
};

export default ReportsPage; 