const mysql = require('mysql2');
const config = require('./config');

// 创建数据库连接池
const pool = mysql.createPool({
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    port: config.DB_PORT, // 显式指定端口
    waitForConnections: true,
    connectionLimit: 5, // Serverless 环境下减少连接数
    queueLimit: 0,
    connectTimeout: 20000, // 增加连接超时时间到 20秒
    dateStrings: true // 强制返回字符串格式的日期，避免时区转换导致的一天偏差
});

module.exports = pool.promise();
