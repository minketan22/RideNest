const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-super-secret-key'; // Must be the same as in auth.js

// This middleware will check for a valid token
const auth = (req, res, next) => {
  // 1. Get token from the header
  const token = req.header('Authorization');

  // 2. Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 3. Verify token
  try {
    // The token will be sent as "Bearer <token>", so we split it
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    
    // Add the user payload (which has user.id and user.role) to the request
    req.user = decoded.user;
    next(); // Move to the next function (the actual route)
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// This middleware checks if the user is an 'agency'
const isAgency = (req, res, next) => {
    if (req.user.role !== 'agency') {
        return res.status(403).json({ msg: 'Access denied: Not an agency' });
    }
    next();
};

module.exports = { auth, isAgency };