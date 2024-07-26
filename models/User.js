// models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fingerprint: String,
    browserInfo: Object,
    createTime: Date,
    browseTime: Date,
    locationInfo: {
        type: Object,
        default: null
    },
    currentURL: String
});

module.exports = mongoose.model('User', userSchema);
