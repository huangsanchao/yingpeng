const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { authMiddleware } = require('./middleware/auth');

const app = express();
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: '50mb' }));

mongoose.connect(config.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Public routes
app.use('/api/auth', require('./routes/auth'));

// Protected routes (require login)
app.use('/api/users', require('./routes/users'));
app.use('/api/system', require('./routes/system'));
app.use('/api/import', authMiddleware, require('./routes/import'));
app.use('/api/billing', authMiddleware, require('./routes/billing'));
app.use('/api/sales', authMiddleware, require('./routes/sales'));
app.use('/api/cost', authMiddleware, require('./routes/cost'));
app.use('/api/refund', authMiddleware, require('./routes/refund'));
app.use('/api/payment', authMiddleware, require('./routes/payment'));
app.use('/api/expense', authMiddleware, require('./routes/expense'));
app.use('/api/contracts', authMiddleware, require('./routes/contracts'));
app.use('/api/base', authMiddleware, require('./routes/baseData'));

app.use('/uploads', express.static(path.join(__dirname, '..', config.UPLOAD_DIR.replace('./server/', ''))));

// Serve frontend static files in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  // Daily auto-backup at 2:00 AM
  scheduleDailyBackup();
});

// Auto daily backup
function scheduleDailyBackup() {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const next2am = new Date(now);
  next2am.setHours(2, 0, 0, 0);
  if (next2am <= now) next2am.setDate(next2am.getDate() + 1);

  const delay = next2am.getTime() - now.getTime();
  setTimeout(() => {
    doBackup();
    setInterval(doBackup, ONE_DAY);
  }, delay);
  console.log(`Daily backup scheduled at ${next2am.toLocaleString('zh-CN')}`);
}

function doBackup() {
  const { exec } = require('child_process');
  const fs = require('fs');
  const backupDir = path.resolve(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dumpPath = path.join(backupDir, `backup_${timestamp}`);
  const dbName = config.MONGO_URI.split('/').pop().split('?')[0];
  const mongoHost = config.MONGO_URI.split('@')[1] || '127.0.0.1:27017';

  exec(`mongodump --host ${mongoHost} --db ${dbName} --out "${dumpPath}"`, (err) => {
    if (err) console.error('Auto backup failed:', err.message);
    else console.log('Auto backup completed:', dumpPath);
  });
}

module.exports = app;
