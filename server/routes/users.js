const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OperationLog = require('../models/OperationLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logMiddleware } = require('../middleware/logger');

// List users (admin only)
router.get('/list', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user (admin only)
router.post('/create', authMiddleware, roleMiddleware('admin'), logMiddleware('create', 'user', (req) => `创建用户: ${req.body.username}`), async (req, res) => {
  try {
    const { username, password, role, realName } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: '用户名已存在' });

    const hash = bcrypt.hashSync(password, 10);
    const user = await User.create({ username, password: hash, role: role || 'ops', realName });
    res.json({ message: '创建成功', user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { password, role, realName } = req.body;
    const isSelf = req.params.id === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Self password change: must provide old password
    if (isSelf && password && req.headers['x-old-password']) {
      const currentUser = await User.findById(req.user._id);
      if (!currentUser.comparePassword(req.headers['x-old-password'])) {
        return res.status(400).json({ error: '旧密码不正确' });
      }
      await User.findByIdAndUpdate(req.params.id, { password: bcrypt.hashSync(password, 10) });
      OperationLog.create({
        userId: req.user._id,
        username: req.user.username,
        action: 'update',
        resource: 'user',
        detail: `修改密码`,
        ip: req.ip
      }).catch(() => {});
      return res.json({ message: '密码修改成功' });
    }

    // Admin operations: role change, realName change, or password reset for others
    if (!isAdmin) return res.status(403).json({ error: '权限不足' });

    const update = {};
    if (role) update.role = role;
    if (realName !== undefined) update.realName = realName;
    if (password && !req.headers['x-old-password']) update.password = bcrypt.hashSync(password, 10);

    const target = await User.findById(req.params.id);
    const detail = password ? `重置用户 ${target?.username} 密码` : `编辑用户 ${target?.username}`;
    OperationLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'update',
      resource: 'user',
      detail,
      ip: req.ip
    }).catch(() => {});

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    res.json({ message: '更新成功', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), logMiddleware('delete', 'user', (req) => `删除用户`), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: '不能删除自己' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
