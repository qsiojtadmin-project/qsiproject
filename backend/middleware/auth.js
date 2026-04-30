const jwt = require('jsonwebtoken');

const normalizeRole = (role) => (role === 'applicant' ? 'user' : role);

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      ...payload,
      role: normalizeRole(payload.role),
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(normalizeRole(req.user.role))) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
};

module.exports = { authenticate, authorize, normalizeRole };
