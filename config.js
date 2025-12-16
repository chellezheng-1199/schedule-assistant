let secrets = {};
try {
    secrets = require('./secrets');
} catch (e) {
    // secrets.js will not exist in production environment (e.g. Render/Railway)
    // There, we rely on Environment Variables.
}

module.exports = {
    DB_HOST: process.env.DB_HOST || secrets.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || secrets.DB_PORT || 3306, // Added DB_PORT support
    DB_USER: process.env.DB_USER || secrets.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || secrets.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME || secrets.DB_NAME || 'schedule_assistant',
    // AI Config
    AI_API_KEY: process.env.AI_API_KEY || secrets.AI_API_KEY,
    AI_API_URL: process.env.AI_API_URL || secrets.AI_API_URL || 'https://api.siliconflow.cn/v1/chat/completions',
    AI_MODEL: process.env.AI_MODEL || secrets.AI_MODEL || 'Qwen/Qwen2.5-VL-72B-Instruct'
};
