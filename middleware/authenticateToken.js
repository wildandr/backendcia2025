const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'backendCIA'

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' })
    }
    return res.status(403).json({ message: 'Invalid token' })
  }
}

module.exports = authenticateToken
