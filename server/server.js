const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// JWT secret (in production, use environment variable)
const JWT_SECRET = 'your-secret-key';

const dbConfig = {
  host: 'localhost',
  user:'root',
  password: '',
  database: 'warehouse_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);


// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// User registration
app.post('/auth/register', async (req, res) => {
  const { username, email, password, full_name, role = 'staff' } = req.body;

  try {
    // Validate input
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, full_name, role]
    );

    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token and get user info
app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, full_name, role, last_login, created_at FROM users WHERE id = ? AND is_active = TRUE',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal)
app.post('/auth/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

app.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new category
app.post('/categories', async (req, res) => {
  const { name, description } = req.body;
  
  try {
    const [result] = await pool.execute('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
    res.status(201).json({ id: result.insertId, message: 'Category created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard statistics
app.get('/dashboard/stats', async (req, res) => {
  try {
    // Total products
    const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');
    
    // Total stock value
    const [totalValue] = await pool.execute('SELECT SUM(current_stock * unit_price) as total FROM products');
    
    // Low stock products
    const [lowStock] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE current_stock <= min_stock');
    
    // Out of stock products
    const [outOfStock] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE current_stock = 0');
    
    // Recent movements
    const [recentMovements] = await pool.execute(`
      SELECT 
        sm.*,
        p.name as product_name,
        p.sku
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ORDER BY sm.created_at DESC
      LIMIT 10
    `);
    
    // Stock by category
    const [stockByCategory] = await pool.execute(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as product_count,
        SUM(p.current_stock) as total_stock
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY total_stock DESC
    `);
    
    // Warehouse utilization
    const [warehouseUtilization] = await pool.execute(`
      SELECT 
        wa.name as area_name,
        COUNT(wl.id) as total_locations,
        COUNT(CASE WHEN wl.is_occupied = TRUE THEN 1 END) as used_locations,
        ROUND(
          (COUNT(CASE WHEN wl.is_occupied = TRUE THEN 1 END) * 100.0 / NULLIF(COUNT(wl.id), 0)), 
          2
        ) as utilization_percentage
      FROM warehouse_areas wa
      LEFT JOIN warehouse_locations wl ON wa.id = wl.area_id
      GROUP BY wa.id, wa.name
    `);
    
    res.json({
      totalProducts: totalProducts[0].count,
      totalValue: totalValue[0].total || 0,
      lowStock: lowStock[0].count,
      outOfStock: outOfStock[0].count,
      recentMovements,
      stockByCategory,
      warehouseUtilization
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all products with location info
app.get("/products", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        wl.location_code,
        wa.name as area_name,
        wa.id as area_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN warehouse_locations wl ON p.location_id = wl.id
      LEFT JOIN warehouse_areas wa ON wl.area_id = wa.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all warehouse areas
app.get("/warehouse-areas", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM warehouse_areas 
      WHERE is_active = TRUE 
      ORDER BY name
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all warehouse locations with area info
app.get("/warehouse-locations", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        wl.*,
        wa.name as area_name,
        p.name as product_name,
        p.sku,
        p.current_stock
      FROM warehouse_locations wl
      LEFT JOIN warehouse_areas wa ON wl.area_id = wa.id
      LEFT JOIN products p ON wl.id = p.location_id
      ORDER BY wa.name, wl.location_code
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
app.get("/products/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT 
        p.*,
        c.name as category_name,
        wl.location_code,
        wa.name as area_name,
        wa.id as area_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN warehouse_locations wl ON p.location_id = wl.id
      LEFT JOIN warehouse_areas wa ON wl.area_id = wa.id
      WHERE p.id = ?
    `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new product
app.post("/products", async (req, res) => {
  const {
    name,
    sku,
    description,
    category_id,
    min_stock,
    max_stock,
    unit_price,
    expiration_date,
    location_id,
    manual_row,
    manual_column,
  } = req.body;

  try {
    // Convert empty strings to null for integer fields
    const processedManualRow =
      manual_row === "" || manual_row === undefined
        ? null
        : parseInt(manual_row);
    const processedManualColumn =
      manual_column === "" || manual_column === undefined
        ? null
        : parseInt(manual_column);
    const processedLocationId = location_id === "" ? null : location_id;
    const processedCategoryId = category_id === "" ? null : category_id;

    const [result] = await pool.execute(
      `
      INSERT INTO products (name, sku, description, category_id, min_stock, max_stock, unit_price, expiration_date, location_id, manual_row, manual_column)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        name,
        sku,
        description,
        processedCategoryId,
        min_stock,
        max_stock,
        unit_price,
        expiration_date || null,
        processedLocationId,
        processedManualRow,
        processedManualColumn,
      ]
    );

    res
      .status(201)
      .json({ id: result.insertId, message: "Product created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put("/products/:id", async (req, res) => {
  const {
    name,
    sku,
    description,
    category_id,
    min_stock,
    max_stock,
    unit_price,
    expiration_date,
    location_id,
    manual_row,
    manual_column,
  } = req.body;

  try {
    // Convert empty strings to null for integer fields
    const processedManualRow =
      manual_row === "" || manual_row === undefined
        ? null
        : parseInt(manual_row);
    const processedManualColumn =
      manual_column === "" || manual_column === undefined
        ? null
        : parseInt(manual_column);
    const processedLocationId = location_id === "" ? null : location_id;
    const processedCategoryId = category_id === "" ? null : category_id;

    const [result] = await pool.execute(
      `
      UPDATE products 
      SET name = ?, sku = ?, description = ?, category_id = ?, min_stock = ?, max_stock = ?, unit_price = ?, expiration_date = ?, location_id = ?, manual_row = ?, manual_column = ?
      WHERE id = ?
    `,
      [
        name,
        sku,
        description,
        processedCategoryId,
        min_stock,
        max_stock,
        unit_price,
        expiration_date || null,
        processedLocationId,
        processedManualRow,
        processedManualColumn,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (Hard Delete)
app.delete("/products/:id", async (req, res) => {
  try {
    await pool.query('START TRANSACTION');

    // Delete all stock movements for this product first
    await pool.execute('DELETE FROM stock_movements WHERE product_id = ?', [req.params.id]);

    // Delete the product
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: "Product not found" });
    }

    await pool.query('COMMIT');
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Update stock
app.post("/products/:id/stock", async (req, res) => {
  const { quantity, movement_type, reference_number, notes } = req.body;
  const productId = req.params.id;

  try {
    await pool.query("START TRANSACTION");

    // Insert stock movement
    await pool.execute(
      `
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_number, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        productId,
        movement_type,
        Math.abs(quantity),
        reference_number,
        notes,
        "system",
      ]
    );

    // Update product stock
    const stockChange = movement_type === "in" ? quantity : -quantity;
    await pool.execute(
      `
      UPDATE products SET current_stock = current_stock + ? WHERE id = ?
    `,
      [stockChange, productId]
    );

    await pool.query("COMMIT");
    res.json({ message: "Stock updated successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  }
});

// Report generation endpoints removed - now handled in frontend

// Get available report types
app.get('/reports/types', authenticateToken, (req, res) => {
  res.json([
    {
      id: 'stock-excel',
      name: 'Stock Report (Excel)',
      description: 'Complete inventory stock report with current levels, locations, and valuations',
      format: 'Excel (.xlsx)'
    },
    {
      id: 'near-expiry-excel',
      name: 'Near Expiry Report (Excel)', 
      description: 'Products approaching expiration within specified timeframe',
      format: 'Excel (.xlsx)'
    },
    {
      id: 'warehouse-layout-pdf',
      name: 'Warehouse Layout (PDF)',
      description: 'Visual warehouse layout with area and location details',
      format: 'PDF (.pdf)'
    }
  ]);
});

// Get all stock movements with filtering
app.get('/stock-movements', authenticateToken, async (req, res) => {
  try {
    const { 
      product_id, 
      movement_type, 
      start_date, 
      end_date, 
      page = 1, 
      limit = 50 
    } = req.query;

    let whereConditions = [];
    let queryParams = [];

    // Build WHERE clause based on filters
    if (product_id) {
      whereConditions.push('sm.product_id = ?');
      queryParams.push(product_id);
    }

    if (movement_type) {
      whereConditions.push('sm.movement_type = ?');
      queryParams.push(movement_type);
    }

    if (start_date) {
      whereConditions.push('DATE(sm.created_at) >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('DATE(sm.created_at) <= ?');
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      ${whereClause}
    `;

    const [countResult] = await pool.execute(countQuery, queryParams);
    const total = countResult[0].total;

    // Get stock movements with product details
    const query = `
      SELECT 
        sm.*,
        p.name as product_name,
        p.sku as product_sku,
        c.name as category_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const [movements] = await pool.execute(query, queryParams);

    res.json({
      movements,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total,
        total_pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock movements for a specific product
app.get('/stock-movements/product/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM stock_movements WHERE product_id = ?',
      [productId]
    );
    const total = countResult[0].total;

    // Get movements
    const [movements] = await pool.execute(`
      SELECT 
        sm.*,
        p.name as product_name,
        p.sku as product_sku
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      WHERE sm.product_id = ?
      ORDER BY sm.created_at DESC
      LIMIT ? OFFSET ?
    `, [productId, parseInt(limit), offset]);

    res.json({
      movements,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total,
        total_pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching product movements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock movement statistics
app.get('/stock-movements/stats', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = '';
    let queryParams = [];

    if (start_date || end_date) {
      const conditions = [];
      if (start_date) {
        conditions.push('DATE(created_at) >= ?');
        queryParams.push(start_date);
      }
      if (end_date) {
        conditions.push('DATE(created_at) <= ?');
        queryParams.push(end_date);
      }
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Get movement statistics
    const [stats] = await pool.execute(`
      SELECT 
        movement_type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM stock_movements
      ${whereClause}
      GROUP BY movement_type
    `, queryParams);

    // Get daily movement trends (last 30 days)
    const [trends] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        movement_type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM stock_movements
      WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
      GROUP BY DATE(created_at), movement_type
      ORDER BY date DESC
    `);

    // Get top products by movement activity
    const [topProducts] = await pool.execute(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(sm.id) as movement_count,
        SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END) as total_out
      FROM products p
      LEFT JOIN stock_movements sm ON p.id = sm.product_id
      ${whereClause.replace('created_at', 'sm.created_at')}
      GROUP BY p.id, p.name, p.sku
      HAVING movement_count > 0
      ORDER BY movement_count DESC
      LIMIT 10
    `, queryParams);

    res.json({
      stats,
      trends,
      topProducts
    });

  } catch (error) {
    console.error('Error fetching movement stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual stock movement
app.post('/stock-movements/', authenticateToken, async (req, res) => {
  const { 
    product_id, 
    movement_type, 
    quantity, 
    reference_number, 
    notes 
  } = req.body;

  try {
    // Validate input
    if (!product_id || !movement_type || !quantity) {
      return res.status(400).json({ 
        error: 'Product ID, movement type, and quantity are required' 
      });
    }

    if (!['in', 'out', 'adjustment'].includes(movement_type)) {
      return res.status(400).json({ 
        error: 'Movement type must be in, out, or adjustment' 
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ 
        error: 'Quantity must be greater than 0' 
      });
    }

    // Check if product exists
    const [products] = await pool.execute(
      'SELECT id, current_stock FROM products WHERE id = ?',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];

    // For 'out' movements, check if there's enough stock
    if (movement_type === 'out' && product.current_stock < quantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock for this movement' 
      });
    }

    await pool.query('START TRANSACTION');

    // Insert stock movement
    const [result] = await pool.execute(
      `INSERT INTO stock_movements 
       (product_id, movement_type, quantity, reference_number, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        movement_type,
        Math.abs(quantity),
        reference_number || null,
        notes || null,
        req.user.username
      ]
    );

    // Update product stock
    let stockChange;
    switch (movement_type) {
      case 'in':
        stockChange = quantity;
        break;
      case 'out':
        stockChange = -quantity;
        break;
      case 'adjustment':
        // For adjustment, we set the stock to the specified quantity
        stockChange = quantity - product.current_stock;
        break;
    }

    await pool.execute(
      'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
      [stockChange, product_id]
    );

    await pool.query('COMMIT');

    res.status(201).json({
      message: 'Stock movement recorded successfully',
      id: result.insertId
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating stock movement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete stock movement (admin only)
app.delete('/stock-movements/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get movement details before deletion
    const [movements] = await pool.execute(
      'SELECT * FROM stock_movements WHERE id = ?',
      [req.params.id]
    );

    if (movements.length === 0) {
      return res.status(404).json({ error: 'Stock movement not found' });
    }

    const movement = movements[0];

    await pool.query('START TRANSACTION');

    // Reverse the stock change
    let stockChange;
    switch (movement.movement_type) {
      case 'in':
        stockChange = -movement.quantity;
        break;
      case 'out':
        stockChange = movement.quantity;
        break;
      case 'adjustment':
        // For adjustments, this is complex - might need manual intervention
        return res.status(400).json({ 
          error: 'Cannot automatically reverse adjustment movements' 
        });
    }

    await pool.execute(
      'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
      [stockChange, movement.product_id]
    );

    // Delete the movement
    await pool.execute('DELETE FROM stock_movements WHERE id = ?', [req.params.id]);

    await pool.query('COMMIT');

    res.json({ message: 'Stock movement deleted and stock adjusted' });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting stock movement:', error);
    res.status(500).json({ error: error.message });
  }
});


const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all users (admin only)
app.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single user
app.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [users] = await pool.execute(`
      SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at
      FROM users 
      WHERE id = ?
    `, [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new user (admin only)
app.post('/users/', authenticateToken, requireAdmin, async (req, res) => {
  const { username, email, password, full_name, role = 'staff' } = req.body;

  try {
    // Validate input
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, full_name, role]
    );

    res.status(201).json({
      message: 'User created successfully',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/users/:id', authenticateToken, async (req, res) => {
  const { username, email, full_name, role, is_active, password } = req.body;

  try {
    // Users can only update their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Non-admin users cannot change role or is_active
    if (req.user.role !== 'admin' && (role !== undefined || is_active !== undefined)) {
      return res.status(403).json({ error: 'Cannot modify role or status' });
    }

    // Check if username/email already exists for other users
    if (username || email) {
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
        [username || '', email || '', req.params.id]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (username) { updates.push('username = ?'); values.push(username); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (full_name) { updates.push('full_name = ?'); values.push(full_name); }
    if (role && req.user.role === 'admin') { updates.push('role = ?'); values.push(role); }
    if (is_active !== undefined && req.user.role === 'admin') { updates.push('is_active = ?'); values.push(is_active); }
    
    if (password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.params.id);

    const [result] = await pool.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Change password
app.put('/users/:id/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Users can only change their own password unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // For non-admin users, verify current password
    if (req.user.role !== 'admin') {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }

      const [users] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.params.id]);
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const [result] = await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/warehouse/areas', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM warehouse_areas ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new warehouse area
app.post('/warehouse/areas', async (req, res) => {
  const { name, type, x, y, width, height, color } = req.body;
  
  try {
    const [result] = await pool.execute(`
      INSERT INTO warehouse_areas (name, type, x, y, width, height, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, type, x, y, width, height, color]);
    
    res.status(201).json({ id: result.insertId, message: 'Warehouse area created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update warehouse area
app.put('/warehouse/areas/:id', async (req, res) => {
  const { name, type, x, y, width, height, color } = req.body;
  
  try {
    const [result] = await pool.execute(`
      UPDATE warehouse_areas 
      SET name = ?, type = ?, x = ?, y = ?, width = ?, height = ?, color = ?
      WHERE id = ?
    `, [name, type, x, y, width, height, color, req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Warehouse area not found' });
    }
    
    res.json({ message: 'Warehouse area updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete warehouse area (Hard Delete)
app.delete('/warehouse/areas/:id', async (req, res) => {
  try {
    await pool.query('START TRANSACTION');

    // Check if area has locations
    const [locations] = await pool.execute('SELECT COUNT(*) as count FROM warehouse_locations WHERE area_id = ?', [req.params.id]);
    
    if (locations[0].count > 0) {
      // Check if any locations are used by products
      const [productsUsingLocations] = await pool.execute(`
        SELECT COUNT(*) as count 
        FROM products p 
        JOIN warehouse_locations wl ON p.location_id = wl.id 
        WHERE wl.area_id = ?
      `, [req.params.id]);

      if (productsUsingLocations[0].count > 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Cannot delete area. ${productsUsingLocations[0].count} products are still using locations in this area. Please move or delete the products first.`
        });
      }

      // Delete all locations in this area first
      await pool.execute('DELETE FROM warehouse_locations WHERE area_id = ?', [req.params.id]);
    }

    // Delete the warehouse area
    const [result] = await pool.execute('DELETE FROM warehouse_areas WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Warehouse area not found' });
    }

    await pool.query('COMMIT');
    res.json({ 
      message: 'Warehouse area deleted successfully',
      deletedLocations: locations[0].count
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Get all warehouse locations
app.get('/warehouse/locations', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        wl.*,
        wa.name as area_name,
        wa.color as area_color
      FROM warehouse_locations wl
      LEFT JOIN warehouse_areas wa ON wl.area_id = wa.id
      ORDER BY wl.location_code
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new warehouse location
app.post('/warehouse/locations', async (req, res) => {
  const { area_id, row_number, column_number, location_code, capacity } = req.body;
  
  try {
    const [result] = await pool.execute(`
      INSERT INTO warehouse_locations (area_id, row_number, column_number, location_code, capacity)
      VALUES (?, ?, ?, ?, ?)
    `, [area_id, row_number, column_number, location_code, capacity || 100]);
    
    res.status(201).json({ id: result.insertId, message: 'Warehouse location created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update warehouse location
app.put('/warehouse/locations/:id', async (req, res) => {
  const { area_id, row_number, column_number, location_code, capacity } = req.body;
  
  try {
    const [result] = await pool.execute(`
      UPDATE warehouse_locations 
      SET area_id = ?, row_number = ?, column_number = ?, location_code = ?, capacity = ?
      WHERE id = ?
    `, [area_id, row_number, column_number, location_code, capacity || 100, req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Warehouse location not found' });
    }
    
    res.json({ message: 'Warehouse location updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete warehouse location
app.delete('/warehouse/locations/:id', async (req, res) => {
  try {
    // Check if location is used by any products
    const [productsUsingLocation] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE location_id = ?
    `, [req.params.id]);

    if (productsUsingLocation[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete location. ${productsUsingLocation[0].count} products are still using this location. Please move or delete the products first.`
      });
    }

    const [result] = await pool.execute('DELETE FROM warehouse_locations WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Warehouse location not found' });
    }
    
    res.json({ message: 'Warehouse location deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => {
  console.log(`Server running on port 5000`);
});