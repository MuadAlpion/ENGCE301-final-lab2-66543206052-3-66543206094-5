const jwt = require('jsonwebtoken')

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return null
  }
}

module.exports = { verifyToken }