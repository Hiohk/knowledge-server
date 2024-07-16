// models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fingerprint: String,
    browserInfo: String,
    createTime: Date,
    browseTime: Date,
    locationInfo: {
        type: Object,
        default: null
    },
    currentURL: String
    // 其他字段根据需要添加
});

module.exports = mongoose.model('User', userSchema);
