const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Superadmin only middleware (convenience wrapper)
exports.superadminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin access required'
    });
  }

  next();
};

// Admin only middleware (deprecated - use superadminOnly or authorize('superadmin'))
// Kept for backward compatibility but checks for superadmin
exports.adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin access required'
    });
  }

  next();
};

// Basic check if token exists and is valid (used by store-scoped routes)
exports.verifyStoreToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    console.warn(`[Auth] No token found in Authorization header for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ success: false, message: 'No auth token found' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // payload structure: { customer: { id, storeId } }
    if (!decoded.customer || !decoded.customer.id) {
      console.error('[Auth] Token verified but missing customer info:', decoded);
      return res.status(401).json({ success: false, message: 'Invalid token payload' });
    }

    req.customer = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn(`[Auth] Token expired for ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    console.error(`[Auth] Token verification failed for ${req.method} ${req.originalUrl}:`, err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
