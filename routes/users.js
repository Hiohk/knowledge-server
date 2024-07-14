var express = require('express');
var router = express.Router();
const User = require('../models/User');

// GET 当前用户信息
router.get('/getUser', async (req, res, next) => {
  try {
    const { fingerprint } = req.query;
    const user = await User.findOne({ fingerprint });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// 查询访问用户总数
router.get('/getAllUserCount', async (req, res, next) => {
  try {
    const totalCount = await User.countDocuments();
    res.json({ totalUsers: totalCount });
  } catch (err) {
    next(err);
  }
});



// GET 返回用户正在浏览的信息
router.get('/active', async (req, res, next) => {
  res.render('index', { title: 'Express-active' });
  try {
    const users = await User.find({ lastActive: { $gt: new Date(Date.now() - 10 * 60 * 1000) } });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
