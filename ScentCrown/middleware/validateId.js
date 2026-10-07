function validateId(req, res, next) {
  const id = req.params.id || req.params.productId;
  if (!/^[1-9]\d{0,19}$/.test(id || '')) {
    return res.status(400).json({ error: 'A valid resource ID is required.' });
  }
  next();
}

module.exports = validateId;
