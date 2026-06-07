const router = require('express').Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const OperationLog = require('../models/OperationLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const config = require('../config');

// Operation logs query (admin/finance)
router.get('/logs', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { page = 1, pageSize = 20, action, username } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (username) filter.username = { $regex: username, $options: 'i' };

    const total = await OperationLog.countDocuments(filter);
    const logs = await OperationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));

    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual backup (admin only)
router.post('/backup', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const backupDir = path.resolve(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dumpPath = path.join(backupDir, `backup_${timestamp}`);

    const dbName = config.MONGO_URI.split('/').pop().split('?')[0];
    const mongoHost = config.MONGO_URI.split('@')[1] || '127.0.0.1:27017';

    const cmd = `mongodump --host ${mongoHost} --db ${dbName} --out "${dumpPath}"`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: `备份失败: ${err.message}` });

      // Clean old backups (keep last 7 days)
      const dirs = fs.readdirSync(backupDir).filter(f => f.startsWith('backup_'));
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      for (const d of dirs) {
        const stat = fs.statSync(path.join(backupDir, d));
        if (stat.mtimeMs < cutoff) {
          fs.rmSync(path.join(backupDir, d), { recursive: true });
        }
      }

      OperationLog.create({
        userId: req.user._id,
        username: req.user.username,
        action: 'backup',
        resource: 'database',
        detail: `手动数据备份: ${dumpPath}`,
        ip: req.ip
      }).catch(() => {});

      res.json({ message: '备份成功', path: dumpPath });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List backups (admin only)
router.get('/backups', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const backupDir = path.resolve(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) return res.json([]);

    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime, size: '—' }))
      .sort((a, b) => b.time - a.time);

    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
