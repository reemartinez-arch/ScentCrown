const bcrypt = require('bcrypt');
const pool = require('../config/database');

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

function establishSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.user = publicUser(user);
      req.session.save((saveError) => {
        if (saveError) return reject(saveError);
        resolve();
      });
    });
  });
}

async function register(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Enter a valid name and email, and a password of 8–72 characters.' });
  }

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash],
  );
  const user = { id: result.insertId, name, email, role: 'customer' };
  await establishSession(req, user);
  res.status(201).json({ user: publicUser(user) });
}

async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const [rows] = await pool.execute(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
    [email],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  await establishSession(req, user);
  res.json({ user: req.session.user });
}

function me(req, res) {
  res.json({ user: req.session.user ? publicUser(req.session.user) : null });
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('scentcrown.sid');
    res.json({ success: true });
  });
}

async function updateProfile(req, res) {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
  }
  await pool.execute('UPDATE users SET name = ? WHERE id = ?', [name, req.session.user.id]);
  req.session.user.name = name;
  res.json({ user: publicUser(req.session.user) });
}

module.exports = { register, login, me, logout, updateProfile };
