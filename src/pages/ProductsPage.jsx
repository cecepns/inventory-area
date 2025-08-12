import { useNavigate } from 'react-router-dom';
import ProductManagement from '../components/ProductManagement';

const ProductsPage = () => {
  const navigate = useNavigate();

  const handleLocationClick = (areaId) => {
    navigate(`/warehouse?area=${areaId}`);
  };

  return <ProductManagement onLocationClick={handleLocationClick} />;
};

export default ProductsPage; 