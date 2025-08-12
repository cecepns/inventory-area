-- Warehouse Management System Database Schema
-- Created for warehouse inventory and layout management

-- Create database
CREATE DATABASE IF NOT EXISTS warehouse_management;
USE warehouse_management;

-- Table for storing warehouse areas/zones
CREATE TABLE IF NOT EXISTS warehouse_areas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type ENUM('area', 'aisle', 'door', 'office') DEFAULT 'area',
    x INT NOT NULL DEFAULT 0,
    y INT NOT NULL DEFAULT 0,
    width INT NOT NULL DEFAULT 1,
    height INT NOT NULL DEFAULT 1,
    color VARCHAR(7) DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for storing warehouse grid locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    area_id INT,
    row_number INT NOT NULL,
    column_number INT NOT NULL,
    location_code VARCHAR(20) NOT NULL UNIQUE,
    is_occupied BOOLEAN DEFAULT FALSE,
    capacity INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES warehouse_areas(id) ON DELETE SET NULL,
    INDEX idx_location_code (location_code),
    INDEX idx_row_col (row_number, column_number)
);

-- Table for storing product categories
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing products/items
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category_id INT,
    current_stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    max_stock INT DEFAULT 1000,
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    expiration_date DATE,
    location_id INT,
    manual_row INT,
    manual_column INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_stock (current_stock),
    INDEX idx_location (location_id),
    INDEX idx_expiration (expiration_date)
);

-- Table for stock movements/transactions
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'adjustment') NOT NULL,
    quantity INT NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_movement (product_id, movement_type),
    INDEX idx_created_at (created_at)
);

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and components'),
('Clothing', 'Apparel and textiles'),
('Food & Beverages', 'Consumable items'),
('Tools', 'Hardware and tools'),
('Books', 'Books and publications');

-- Insert sample warehouse areas
INSERT INTO warehouse_areas (name, type, x, y, width, height, color) VALUES
('Storage Area A', 'area', 2, 2, 8, 6, '#3b82f6'),
('Storage Area B', 'area', 12, 2, 8, 6, '#10b981'),
('Main Aisle', 'aisle', 10, 1, 2, 10, '#6b7280'),
('Loading Dock', 'area', 2, 10, 6, 3, '#f59e0b'),
('Office Area', 'office', 15, 10, 5, 3, '#8b5cf6');

-- Insert sample warehouse locations
INSERT INTO warehouse_locations (area_id, row_number, column_number, location_code) VALUES
(1, 1, 1, 'A1-1'), (1, 1, 2, 'A1-2'), (1, 1, 3, 'A1-3'),
(1, 2, 1, 'A2-1'), (1, 2, 2, 'A2-2'), (1, 2, 3, 'A2-3'),
(2, 1, 1, 'B1-1'), (2, 1, 2, 'B1-2'), (2, 1, 3, 'B1-3'),
(2, 2, 1, 'B2-1'), (2, 2, 2, 'B2-2'), (2, 2, 3, 'B2-3');

-- Table for storing users
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Insert sample products
INSERT INTO products (name, sku, description, category_id, current_stock, min_stock, expiration_date, location_id) VALUES
('Laptop Dell XPS 13', 'DELL-XPS13-001', 'High-performance ultrabook', 1, 15, 5, '2026-12-31', 1),
('Cotton T-Shirt Blue', 'TSHIRT-BLUE-M', 'Medium size cotton t-shirt', 2, 50, 10, NULL, 2),
('Coffee Beans Premium', 'COFFEE-PREM-1KG', '1kg premium coffee beans', 3, 25, 5, '2025-06-15', 3),
('Screwdriver Set', 'TOOL-SCREW-SET', '12-piece screwdriver set', 4, 8, 3, NULL, 4),
('Programming Book JS', 'BOOK-JS-ADV', 'Advanced JavaScript programming', 5, 12, 2, NULL, 5);

-- Insert sample admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@warehouse.com', '$2b$10$K7L.GvVp1Xtq8xC8K8RXo.Lp7.Gp7.Gp7.Gp7.Gp7.Gp7.Gp7.Gp7.G', 'System Administrator', 'admin');

-- Insert sample stock movements
INSERT INTO stock_movements (product_id, movement_type, quantity, reference_number, notes, created_by) VALUES
(1, 'in', 20, 'PO-2024-001', 'Initial stock', 'admin'),
(2, 'in', 100, 'PO-2024-002', 'Bulk purchase', 'admin'),
(3, 'in', 30, 'PO-2024-003', 'Monthly restock', 'admin'),
(1, 'out', 5, 'SO-2024-001', 'Sales order', 'admin'),
(2, 'out', 50, 'SO-2024-002', 'Bulk sale', 'admin');