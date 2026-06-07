require('dotenv').config()

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_analytics',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './server/uploads',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173'
}
