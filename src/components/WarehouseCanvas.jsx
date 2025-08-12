import { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const WarehouseCanvas = ({ areas, onAreaClick, onCanvasClick, selectedTool, width, height, selectedAreaId }) => {
  const canvasRef = useRef(null);
  const [hoveredArea, setHoveredArea] = useState(null);

  useEffect(() => {
    drawCanvas();
  }, [areas, hoveredArea, selectedTool, width, height]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    drawGrid(ctx);
    
    // Draw areas
    areas.forEach(area => {
      const isHovered = area.id === hoveredArea?.id;
      const isSelected = area.id === selectedAreaId;
      drawArea(ctx, area, isHovered, isSelected);
    });
  };

  const drawGrid = (ctx) => {
    const gridSize = 20;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawArea = (ctx, area, isHovered = false, isSelected = false) => {
    ctx.fillStyle = area.color;
    
    // Different stroke styles for different states
    if (isSelected) {
      ctx.strokeStyle = '#ef4444'; // Red for selected
      ctx.lineWidth = 4;
    } else if (isHovered) {
      ctx.strokeStyle = '#000000'; // Black for hovered
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = '#ffffff'; // White for normal
      ctx.lineWidth = 2;
    }
    
    // Draw area rectangle
    ctx.fillRect(area.x, area.y, area.width, area.height);
    ctx.strokeRect(area.x, area.y, area.width, area.height);
    
    // Draw area label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = area.x + area.width / 2;
    const centerY = area.y + area.height / 2;
    
    // Add background for text
    const textMetrics = ctx.measureText(area.name);
    const textWidth = textMetrics.width + 8;
    const textHeight = 16;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      centerX - textWidth / 2, 
      centerY - textHeight / 2, 
      textWidth, 
      textHeight
    );
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(area.name, centerX, centerY);
    
    // Draw area type icon
    ctx.font = '16px sans-serif';
    const typeIcon = getAreaIcon(area.type);
    ctx.fillText(typeIcon, centerX, centerY - 20);
  };

  const getAreaIcon = (type) => {
    switch (type) {
      case 'area': return '🏪';
      case 'aisle': return '🛤️';
      case 'door': return '🚪';
      case 'office': return '🏢';
      default: return '📦';
    }
  };

  const getMousePosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findAreaAtPosition = (position) => {
    return areas.find(area => 
      position.x >= area.x && 
      position.x <= area.x + area.width &&
      position.y >= area.y && 
      position.y <= area.y + area.height
    );
  };

  const handleCanvasClick = (e) => {
    const position = getMousePosition(e);
    const clickedArea = findAreaAtPosition(position);
    
    if (clickedArea) {
      onAreaClick(clickedArea);
    } else if (selectedTool) {
      onCanvasClick(position);
    }
  };

  const handleMouseMove = (e) => {
    const position = getMousePosition(e);
    const area = findAreaAtPosition(position);
    setHoveredArea(area);
    
    // Change cursor based on mode
    const canvas = canvasRef.current;
    if (selectedTool) {
      canvas.style.cursor = 'crosshair';
    } else if (area) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
  };

  const handleMouseLeave = () => {
    setHoveredArea(null);
    canvasRef.current.style.cursor = 'default';
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="border border-gray-300 bg-white"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

WarehouseCanvas.propTypes = {
  areas: PropTypes.array.isRequired,
  onAreaClick: PropTypes.func,
  onCanvasClick: PropTypes.func,
  selectedTool: PropTypes.string,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  selectedAreaId: PropTypes.number,
};

export default WarehouseCanvas;