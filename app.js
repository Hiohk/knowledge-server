const createError = require('http-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const http = require('http');
const mongoose = require('mongoose');
const trackUser = require('./middleware/trackUser');
const { wss } = require('./service/websocketServer'); // 导入在线用户服务

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();
const server = http.createServer(app);


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
server.on('upgrade', function upgrade(request, socket, head) {
  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit('connection', ws, request);
  });
});

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
