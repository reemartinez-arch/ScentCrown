const pool = require('../config/database');

const categories = new Set(['perfume', 'cap']);
const statuses = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

function productInput(body) {
  const name = String(body.name || '').trim();
  const brand = String(body.brand || '').trim();
  const category = String(body.category || '');
  const description = String(body.description || '').trim();
  const price = Number(body.price);
  const stock = Number(body.stock);
  const imageUrl = String(body.imageUrl || '').trim();
  if (!name || name.length > 150 || !brand || brand.length > 100 || !categories.has(category)
      || !description || description.length > 2000 || !Number.isFinite(price) || price <= 0
      || !Number.isInteger(stock) || stock < 0 || stock > 100000
      || imageUrl.length > 500 || (imageUrl && !/^https?:\/\//i.test(imageUrl))) {
    return null;
  }
  return { name, brand, category, description, price, stock, imageUrl, isFeatured: body.isFeatured ? 1 : 0 };
}

async function summary(req, res) {
  const [[totals]] = await pool.execute(
    `SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS revenue
     FROM orders WHERE status != 'cancelled'`,
  );
  const [[customers]] = await pool.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'");
  const [[products]] = await pool.execute('SELECT COUNT(*) AS count FROM products WHERE is_active = 1');
  const [[lowStock]] = await pool.execute('SELECT COUNT(*) AS count FROM products WHERE is_active = 1 AND stock <= 5');
  const [recentOrders] = await pool.execute(
    `SELECT o.id, o.recipient_name, o.total, o.status, o.created_at, u.email
     FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 8`,
  );
  res.json({ totals, customers: customers.count, products: products.count, lowStock: lowStock.count, recentOrders });
}

async function listProducts(req, res) {
  const [products] = await pool.execute(
    'SELECT id, name, brand, category, description, price, stock, image_url, is_featured, is_active FROM products ORDER BY created_at DESC',
  );
  res.json({ products });
}

async function createProduct(req, res) {
  const product = productInput(req.body);
  if (!product) return res.status(400).json({ error: 'Check product details, price, stock, and image URL.' });
  const [result] = await pool.execute(
    `INSERT INTO products (name, brand, category, description, price, stock, image_url, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [product.name, product.brand, product.category, product.description, product.price, product.stock, product.imageUrl, product.isFeatured],
  );
  res.status(201).json({ id: result.insertId });
}

async function updateProduct(req, res) {
  const product = productInput(req.body);
  if (!product) return res.status(400).json({ error: 'Check product details, price, stock, and image URL.' });
  const [result] = await pool.execute(
    `UPDATE products SET name = ?, brand = ?, category = ?, description = ?, price = ?,
     stock = ?, image_url = ?, is_featured = ? WHERE id = ?`,
    [product.name, product.brand, product.category, product.description, product.price, product.stock,
      product.imageUrl, product.isFeatured, req.params.id],
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Product not found.' });
  res.json({ success: true });
}

async function archiveProduct(req, res) {
  const [result] = await pool.execute('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Product not found.' });
  res.json({ success: true });
}

async function inventory(req, res) {
  const [products] = await pool.execute(
    'SELECT id, name, brand, category, stock FROM products WHERE is_active = 1 ORDER BY stock ASC, name',
  );
  res.json({ products });
}

async function updateStock(req, res) {
  const stock = Number(req.body.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
    return res.status(400).json({ error: 'Stock must be a whole number from 0 to 100,000.' });
  }
  const [result] = await pool.execute('UPDATE products SET stock = ? WHERE id = ?', [stock, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Product not found.' });
  res.json({ success: true });
}

async function listOrders(req, res) {
  const [orders] = await pool.execute(
    `SELECT o.id, o.recipient_name, o.phone, o.shipping_address, o.total, o.status,
            o.payment_method, o.payment_status, o.created_at, u.email
     FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`,
  );
  res.json({ orders });
}

async function updateOrderStatus(req, res) {
  const status = String(req.body.status || '');
  if (!statuses.has(status)) return res.status(400).json({ error: 'Invalid order status.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.execute('SELECT status FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found.' });
    }
    const current = orders[0].status;
    if (current === status) {
      await connection.commit();
      return res.json({ success: true });
    }
    const nextStatuses = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };
    if (!nextStatuses[current].includes(status)) {
      await connection.rollback();
      return res.status(409).json({ error: `An order cannot move from ${current} to ${status}.` });
    }
    if (status === 'cancelled') {
      const [items] = await connection.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL',
        [req.params.id],
      );
      for (const item of items) {
        await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }
    await connection.execute(
      "UPDATE orders SET status = ?, payment_status = IF(? = 'delivered', 'paid', payment_status) WHERE id = ?",
      [status, status, req.params.id],
    );
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function customers(req, res) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.created_at, COUNT(o.id) AS order_count,
            COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) AS lifetime_value
     FROM users u LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.role = 'customer' GROUP BY u.id ORDER BY u.created_at DESC`,
  );
  res.json({ customers: rows });
}

async function payments(req, res) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.recipient_name, u.email, o.total, o.payment_method, o.payment_status, o.status, o.created_at
     FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`,
  );
  res.json({ payments: rows });
}

async function reports(req, res) {
  const [monthly] = await pool.execute(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS order_count,
            COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS revenue
     FROM orders WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
     GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month`,
  );
  const [topProducts] = await pool.execute(
    `SELECT product_name AS name, SUM(quantity) AS units_sold, SUM(unit_price * quantity) AS revenue
     FROM order_items GROUP BY product_id, product_name ORDER BY units_sold DESC LIMIT 5`,
  );
  res.json({ monthly, topProducts });
}

module.exports = {
  summary, listProducts, createProduct, updateProduct, archiveProduct,
  inventory, updateStock, listOrders, updateOrderStatus, customers, payments, reports,
};
