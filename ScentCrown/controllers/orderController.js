const pool = require('../config/database');

async function create(req, res) {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim();
  if (name.length < 2 || name.length > 100 || phone.length < 6 || phone.length > 30 || address.length < 8 || address.length > 500) {
    return res.status(400).json({ error: 'Enter a valid recipient name, phone number, and delivery address.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [items] = await connection.execute(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock, p.is_active
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ? FOR UPDATE`,
      [req.session.user.id],
    );
    if (!items.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'Your cart is empty.' });
    }
    for (const item of items) {
      if (!item.is_active || item.quantity > item.stock) {
        await connection.rollback();
        return res.status(409).json({ error: `${item.name} is no longer available in the requested quantity.` });
      }
    }
    const totalCents = items.reduce((sum, item) => sum + Math.round(Number(item.price) * 100) * item.quantity, 0);
    const total = totalCents / 100;
    const [order] = await connection.execute(
      `INSERT INTO orders (user_id, recipient_name, phone, shipping_address, total, payment_method)
       VALUES (?, ?, ?, ?, ?, 'cod')`,
      [req.session.user.id, name, phone, address, total],
    );
    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [order.insertId, item.product_id, item.name, item.price, item.quantity],
      );
      await connection.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id],
      );
    }
    await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [req.session.user.id]);
    await connection.commit();
    res.status(201).json({ orderId: order.insertId, total, status: 'pending' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function list(req, res) {
  const [orders] = await pool.execute(
    `SELECT id, recipient_name, total, status, payment_method, payment_status, created_at
     FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [req.session.user.id],
  );
  res.json({ orders });
}

async function get(req, res) {
  const [orders] = await pool.execute(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.user.id],
  );
  if (!orders.length) return res.status(404).json({ error: 'Order not found.' });
  const [items] = await pool.execute(
    'SELECT product_name, unit_price, quantity FROM order_items WHERE order_id = ?',
    [req.params.id],
  );
  res.json({ order: orders[0], items });
}

module.exports = { create, list, get };
