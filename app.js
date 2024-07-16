const createError = require('http-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const http = require('http');
const mongoose = require('mongoose');
const trackUser = require('./middleware/trackUser');

const { Server } = require('socket.io');
const User = require('./models/User'); // 导入用户模型
// const { wss } = require('./service/websocketServer'); // 导入在线用户服务

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

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

// 监听服务器的端口，启动服务器 8080;
server.listen(8080, () => {
  console.log('Server is listening on : 8080');
});


// MongoDB 连接
// mongoose.connect('mongodb://localhost:27017/knowledge_map'); // 本地开发地址
mongoose.connect('mongodb://mongo:ycQPwrZGLnDdqouchVRmONwYkiHWZkZP@viaduct.proxy.rlwy.net:37893'); // 线上部署地址
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function () {
  console.log("connected successfully!");
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 使用 cors 中间件，允许来自 http://localhost:5173 的请求
app.use(cors({
  origin: '*', // 指定前端项目的地址
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// 使用 trackUser 中间件
app.use('/api', trackUser); // 将中间件应用到 /api 路径下

// 将 WebSocket 服务器与现有的 HTTP 服务器关联
// server.on('upgrade', function upgrade(request, socket, head) {
//   wss.handleUpgrade(request, socket, head, function done(ws) {
//     wss.emit('connection', ws, request);
//   });
// });

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = { app: app, server: server };
