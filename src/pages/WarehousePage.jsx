import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import WarehouseLayout from '../components/WarehouseLayout';

const WarehousePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAreaId, setSelectedAreaId] = useState(null);

  useEffect(() => {
    const areaParam = searchParams.get('area');
    if (areaParam) {
      setSelectedAreaId(parseInt(areaParam));
    }
  }, [searchParams]);

  const handleAreaSelect = (areaId) => {
    setSelectedAreaId(areaId);
    if (areaId) {
      setSearchParams({ area: areaId.toString() });
    } else {
      setSearchParams({});
    }
  };

  return (
    <WarehouseLayout 
      selectedAreaId={selectedAreaId} 
      onAreaSelect={handleAreaSelect} 
    />
  );
};

export default WarehousePage; 