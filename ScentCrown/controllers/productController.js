const pool = require('../config/database');

async function list(req, res) {
  const conditions = ['is_active = 1'];
  const values = [];
  if (req.query.category && !['perfume', 'cap'].includes(req.query.category)) {
    return res.status(400).json({ error: 'Category must be perfume or cap.' });
  }
  if (req.query.category) {
    conditions.push('category = ?');
    values.push(req.query.category);
  }
  if (req.query.featured === 'true') conditions.push('is_featured = 1');
  if (req.query.search) {
    conditions.push('(name LIKE ? OR brand LIKE ? OR description LIKE ?)');
    const term = `%${String(req.query.search).slice(0, 100)}%`;
    values.push(term, term, term);
  }
  const [products] = await pool.execute(
    `SELECT id, name, brand, category, description, price, stock, image_url, is_featured
     FROM products WHERE ${conditions.join(' AND ')} ORDER BY is_featured DESC, created_at DESC`,
    values,
  );
  res.json({ products });
}

async function get(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, name, brand, category, description, price, stock, image_url, is_featured
     FROM products WHERE id = ? AND is_active = 1`,
    [req.params.id],
  );
  if (!rows.length) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: rows[0] });
}

module.exports = { list, get };
