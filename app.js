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
    const { fingerprint, locationInfo, browserInfo, currentURL, timestamp } = data;
    let userInfo = await User.findOne({ fingerprint }); // 根据指纹查找用户信息

    if (userInfo) {
      // 检查数据是否有变化，如果有则更新  
      let shouldUpdate = false;
      const updateObj = {};

      if (userInfo.browserInfo !== browserInfo) {
        updateObj.browserInfo = browserInfo;
        shouldUpdate = true;
      }

      if (userInfo.browseTime !== timestamp) {
        updateObj.browseTime = timestamp;
        shouldUpdate = true;
      }

      if (userInfo.locationInfo !== locationInfo) {
        updateObj.locationInfo = locationInfo;
        shouldUpdate = true;
      }

      if (userInfo.currentURL !== currentURL) {
        updateObj.currentURL = currentURL;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        // 更新用户信息  
        updateObj.browserInfo = browserInfo;
        updateObj.browseTime = timestamp;
        updateObj.locationInfo = locationInfo;
        updateObj.currentURL = currentURL;

        await User.updateOne({ fingerprint }, { $set: updateObj });

        // 同步更新内存中的在线用户信息  
        userInfo = await User.findOne({ fingerprint }); // 重新获取更新后的用户信息  
        onlineUserInfos.set(fingerprint, { socketId: socket.id, userInfo: userInfo });

        broadcastOnlineUsers(); // 广播更新所有在线用户信息给所有客户端  
      }
    } else {
      socket.emit('error', { error: 'User not found' }); // 发送用户未找到的错误信息给客户端
    }
  });

  // 监听客户端断开连接事件
  socket.on('disconnect', () => {
    // 当连接断开时，从在线用户信息 Map 中移除该用户信息
    let fingerprintToDelete;
    onlineUserInfos.forEach((userInfo, fingerprint) => {
      if (userInfo.socketId === socket.id) {
        fingerprintToDelete = fingerprint;
      }
    });

    // 如果找到了对应的指纹，执行删除操作
    if (fingerprintToDelete !== undefined) {
      onlineUserInfos.delete(fingerprintToDelete);
      broadcastOnlineUsers(); // 广播更新所有在线用户信息给所有客户端
    }
    console.log('user disconnected'); // 打印日志，表示用户断开连接
  });
});

// 广播所有在线用户信息给所有客户端
function broadcastOnlineUsers() {
  const onlineUsersArray = Array.from(onlineUserInfos.values());
  let userInfoArr = [];
  onlineUsersArray.map(item => {
    userInfoArr.push(item.userInfo);
  });
  io.emit('onlineUsers', { users: userInfoArr, count: onlineUsersArray.length });
}

// 监听服务器的端口，启动服务器 8000;
const PORT = process.env.PORT || 3030;
const SOCKET_PORT = process.env.SOCKET_PORT || 8000;

server.listen(PORT, () => {
  console.log('Server is listening on :', PORT);
});

// 生产环境请删除
io.listen(SOCKET_PORT, () => {
  console.log(`Socket.io server running on port ${SOCKET_PORT}`);
});

// MongoDB 连接
// mongoose.connect('mongodb://localhost:27017/knowledge_map'); // 本地开发地址
const databaseUrl = "mongodb+srv://root:UOaM9IluRjorkzTx@cluster0.rvt87g0.mongodb.net/knowledge_map?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(databaseUrl); // 线上部署地址
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function () {
  console.log("Mongodb connected successfully!");
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


module.exports = app;
