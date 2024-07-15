// routes/trackUser.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /track-user 接口用于保存用户信息
router.post('/track-user', async (req, res, next) => {
    try {
        const {
            fingerprint,
            browserInfo,
            browseTime,
            locationInfo,
            currentURL
            // 其他需要收集的信息
        } = req.body;

        // 查询数据库中是否已经存在该用户
        const existingUser = await User.findOne({ fingerprint });

        // 如果已存在该用户，则返回已存在的用户信息
        if (existingUser) {
            return res.status(200).json({ code: 200, msg: "User information already exists." });
        }
        // 创建新用户对象
        const newUser = new User({
            fingerprint,
            browserInfo,
            browseTime,
            locationInfo,
            currentURL
        });

        // 保存用户到数据库
        const savedUser = await newUser.save();
        res.status(200).json({ code: 200, msg: "User information saved successfully." }); // 返回保存成功的用户信息
    } catch (err) {
        next(err); // 将错误传递给 Express 的错误处理中间件
    }
});

module.exports = router;
