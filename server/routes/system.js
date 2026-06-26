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
    console.log('[backup] 执行:', cmd);

    exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[backup] 错误:', stderr || err.message);
        return res.status(500).json({ error: `备份失败: ${stderr || err.message}` });
      }

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
      .map(f => {
        const dirPath = path.join(backupDir, f);
        const stat = fs.statSync(dirPath);
        let size = 0;
        try {
          const files = fs.readdirSync(dirPath, { recursive: true });
          for (const file of files) {
            const fstat = fs.statSync(path.join(dirPath, file));
            if (fstat.isFile()) size += fstat.size;
          }
        } catch(e) {}
        return { name: f, time: stat.mtime, size: size ? (size / 1024 / 1024).toFixed(1) + 'MB' : '—' };
      })
      .sort((a, b) => b.time - a.time);

    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore backup (admin only)
router.post('/restore', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { backupName } = req.body;
    if (!backupName) return res.status(400).json({ error: '请选择备份' });

    const backupDir = path.resolve(__dirname, '..', 'backups');
    const dumpPath = path.join(backupDir, backupName);
    if (!fs.existsSync(dumpPath)) return res.status(404).json({ error: '备份文件不存在' });

    const dbName = config.MONGO_URI.split('/').pop().split('?')[0];
    const mongoHost = config.MONGO_URI.split('@')[1] || '127.0.0.1:27017';

    const dumpDbPath = path.join(dumpPath, dbName);
    if (!fs.existsSync(dumpDbPath)) {
      return res.status(404).json({ error: `备份中未找到数据库目录: ${dbName}` });
    }

    // 用 mongoose 清空当前数据库（替代 mongosh 命令）
    const mongoose = require('mongoose');
    const conn = mongoose.connection;
    const collections = await conn.db.listCollections().toArray();
    for (const c of collections) {
      if (!c.name.startsWith('system.')) {
        await conn.db.collection(c.name).deleteMany({});
      }
    }
    console.log('[restore] 已清空当前数据库');

    // 用 mongorestore 恢复
    const restoreCmd = `mongorestore --host ${mongoHost} --db ${dbName} "${dumpDbPath}"`;
    console.log('[restore] 执行:', restoreCmd);

    exec(restoreCmd, { timeout: 300000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[restore] 错误:', stderr || err.message);
        return res.status(500).json({ error: `恢复失败: ${stderr || err.message}` });
      }

      OperationLog.create({
        userId: req.user._id,
        username: req.user.username,
        action: 'restore',
        resource: 'database',
        detail: `从备份恢复: ${backupName}`,
        ip: req.ip
      }).catch(() => {});

      res.json({ message: '恢复成功，请刷新页面' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete backup (admin only)
router.delete('/backup/:name', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const backupDir = path.resolve(__dirname, '..', 'backups');
    const backupPath = path.join(backupDir, req.params.name);
    if (!fs.existsSync(backupPath)) return res.status(404).json({ error: '备份不存在' });

    fs.rmSync(backupPath, { recursive: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
