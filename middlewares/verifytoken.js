const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.headers['authorization'].split(' ')[1];
  if (!token) {
    return res
      .status(403)
      .json({ message: 'A token is required for authentication' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = decoded;
  } catch (err) {
    return res.status(401).json('Invalid Token');
  }
  return next();
}

function verifyTokenAndAuthorization(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.id === req.params.id || req.user.isAdmin) {
      next();
    } else {
      console.log('ID from params:', req.params.id);

      return res
        .status(403)
        .json({ message: 'You are not allowed to do that!' });
    }
  });
}
function verifyTokenAndAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.isAdmin) {
      next();
    } else {
      return res.status(403).json({
        message: 'You are not allowed to do that!',
      });
    }
  });
}

module.exports = {
  verifyToken,
  verifyTokenAndAuthorization,
  verifyTokenAndAdmin,
};
