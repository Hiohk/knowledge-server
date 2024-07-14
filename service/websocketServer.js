// websocket.js

const WebSocket = require('ws');
const User = require('../models/User');

const wss = new WebSocket.Server({ port: 8732 });

// 存储当前在线用户的信息，以用户标识符为键，用户信息为值
const onlineUserInfos = new Map();

wss.on('connection', function connection(ws) {
    // 当有新连接时
    ws.on('message', async function incoming(message) {
        const messageString = message.toString('utf8');
        try {
            const jsonData = JSON.parse(messageString);
            const fingerprint = jsonData.fingerprint;
            const userInfo = await User.findOne({ fingerprint });

            if (userInfo) {
                // 将用户信息存储在 onlineUserInfos 中
                onlineUserInfos.set(fingerprint, userInfo);
                // 广播更新所有在线用户的信息给所有客户端
                broadcastOnlineUsers();
            } else {
                // 处理未找到用户信息的情况
                ws.send(JSON.stringify({ error: 'User not found' }));
            }
        } catch (error) {
            // 处理异常情况
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({ error: 'Error processing message' }));
        }
    });

    broadcastOnlineUsers();

    ws.on('close', function close() {
        // 当连接关闭时，从 onlineUserInfos 中移除该用户信息
        onlineUserInfos.forEach((userInfo, fingerprint) => {
            if (userInfo.ws === ws) {
                onlineUserInfos.delete(fingerprint);
                // 广播更新所有在线用户的信息给所有客户端
                broadcastOnlineUsers();
            }
        });
    });
});

function broadcastOnlineUsers() {
    // 构造在线用户信息数组
    const onlineUsersArray = Array.from(onlineUserInfos.values());
    // 广播更新所有在线用户的信息给所有客户端
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'onlineUsers', users: onlineUsersArray, count: onlineUsersArray.length }));
        }
    });
}

module.exports = wss;
