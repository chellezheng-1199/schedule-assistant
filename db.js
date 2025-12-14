const mysql = require('mysql2');
const config = require('./config');

// 创建数据库连接池
const pool = mysql.createPool({
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true // 强制返回字符串格式的日期，避免时区转换导致的一天偏差
});

module.exports = pool.promise();
