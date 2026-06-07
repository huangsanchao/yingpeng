const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OperationLog = require('../models/OperationLog');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });

    const user = await User.findOne({ username });
    if (!user || !user.comparePassword(password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Log login
    OperationLog.create({
      userId: user._id,
      username: user.username,
      action: 'login',
      resource: 'auth',
      detail: `用户 ${user.username} 登录`,
      ip: req.ip
    }).catch(() => {});

    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role, realName: user.realName }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    user: { id: req.user._id, username: req.user.username, role: req.user.role, realName: req.user.realName }
  });
});

router.post('/init', async (req, res) => {
  // Create default admin if no users exist
  const count = await User.countDocuments();
  if (count > 0) return res.status(400).json({ error: '已有用户，请使用注册接口' });

  const hash = bcrypt.hashSync('admin123', 10);
  const user = await User.create({ username: 'admin', password: hash, role: 'admin', realName: '系统管理员' });
  res.json({ message: '默认管理员已创建', username: 'admin', password: 'admin123' });
});

module.exports = router;
