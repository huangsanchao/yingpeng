const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

async function createTestUser() {
  try {
    await mongoose.connect(config.MONGO_URI);

    const username = 'test';
    const password = 'test123';
    const hashed = bcrypt.hashSync(password, 10);

    const existing = await User.findOne({ username });
    if (existing) {
      console.log(`测试账号已存在: ${username}`);
      return;
    }

    await User.create({
      username,
      password: hashed,
      role: 'admin',
      realName: '测试用户'
    });

    console.log(`测试账号创建成功:`);
    console.log(`  用户名: ${username}`);
    console.log(`  密码: ${password}`);
    console.log(`  角色: admin`);
  } catch (err) {
    console.error('创建失败:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

createTestUser();
