const pool = require('../config/database');

async function list(req, res) {
  const [items] = await pool.execute(
    `SELECT p.id AS product_id, p.name, p.brand, p.price, p.image_url, p.stock, ci.quantity,
            (p.price * ci.quantity) AS line_total
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = ? AND p.is_active = 1 ORDER BY ci.created_at DESC`,
    [req.session.user.id],
  );
  res.json({ items });
}

async function setItem(req, res) {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ error: 'Choose a valid product and quantity (1–99).' });
  }
  const [products] = await pool.execute(
    'SELECT id, stock FROM products WHERE id = ? AND is_active = 1',
    [productId],
  );
  if (!products.length) return res.status(404).json({ error: 'Product not found.' });
  if (quantity > products[0].stock) return res.status(409).json({ error: 'The requested quantity is not in stock.' });

  await pool.execute(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
    [req.session.user.id, productId, quantity],
  );
  res.json({ success: true });
}

async function removeItem(req, res) {
  await pool.execute(
    'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
    [req.session.user.id, req.params.productId],
  );
  res.json({ success: true });
}

module.exports = { list, setItem, removeItem };
