const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const User = require('../models/User'); // 导入用户模型

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // 允许所有来源的跨域请求，根据实际需求设置
        methods: ["GET", "POST"]
    }
});

// 存储当前在线用户的信息，以用户标识符为键，用户信息为值
const onlineUserInfos = new Map();

// 处理客户端连接
io.on('connection', (socket) => {
    console.log('a user connected'); // 打印日志，表示有用户连接

    // 监听客户端发送的页面浏览信息
    socket.on('pageView', async (data) => {
        const { fingerprint, ip, location, path, timestamp } = data;
        const userInfo = await User.findOne({ fingerprint }); // 根据指纹查找用户信息

        if (userInfo) {
            // 更新用户信息
            userInfo.ip = ip;
            userInfo.location = location;
            userInfo.path = path;
            userInfo.timestamp = timestamp;
            userInfo.socketId = socket.id; // 记录用户的Socket ID
            onlineUserInfos.set(fingerprint, userInfo); // 将用户信息存储在 Map 中
            broadcastOnlineUsers(); // 广播更新所有在线用户信息给所有客户端
        } else {
            socket.emit('error', { error: 'User not found' }); // 发送用户未找到的错误信息给客户端
        }
    });

    // 监听客户端断开连接事件
    socket.on('disconnect', () => {
        // 当连接断开时，从在线用户信息 Map 中移除该用户信息
        onlineUserInfos.forEach((userInfo, fingerprint) => {
            if (userInfo.socketId === socket.id) {
                onlineUserInfos.delete(fingerprint);
                broadcastOnlineUsers(); // 广播更新所有在线用户信息给所有客户端
            }
        });
        console.log('user disconnected'); // 打印日志，表示用户断开连接
    });
});

// 广播所有在线用户信息给所有客户端
function broadcastOnlineUsers() {
    const onlineUsersArray = Array.from(onlineUserInfos.values());
    io.emit('onlineUsers', { users: onlineUsersArray, count: onlineUsersArray.length });
}

// 监听服务器的端口，启动服务器
server.listen(8080, () => {
    console.log('Server is listening on : 8080');
});

module.exports = server; 
