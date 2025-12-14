const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const config = require('./config');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Todos API ---

// 获取所有待办事项
app.get('/api/todos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM todos ORDER BY created_at DESC');
        // 因为 db.js 开启了 dateStrings: true，这里获取到的 deadline 已经是 "YYYY-MM-DD" 字符串了
        // 或者 null。直接返回即可，无需手动转换。
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 添加待办事项
app.post('/api/todos', async (req, res) => {
    const { text, deadline, priority, completed } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO todos (text, deadline, priority, completed) VALUES (?, ?, ?, ?)',
            [text, deadline, priority || 'medium', completed || false]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 更新待办事项 (完成状态, 文本, 优先级, 日期)
app.put('/api/todos/:id', async (req, res) => {
    const { id } = req.params;
    const { text, deadline, priority, completed } = req.body;
    
    try {
        // 动态构建更新语句
        const fields = [];
        const values = [];
        if (text !== undefined) { fields.push('text = ?'); values.push(text); }
        if (deadline !== undefined) { fields.push('deadline = ?'); values.push(deadline); }
        if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
        if (completed !== undefined) { fields.push('completed = ?'); values.push(completed); }
        
        if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });
        
        values.push(id);
        await db.query(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ message: 'Todo updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除待办事项
app.delete('/api/todos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM todos WHERE id = ?', [id]);
        res.json({ message: 'Todo deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Events API ---

// 获取所有日程
app.get('/api/events', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM events ORDER BY date, time');
        // 同样，直接返回字符串格式的日期
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 添加日程
app.post('/api/events', async (req, res) => {
    const { title, date, time } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO events (title, date, time) VALUES (?, ?, ?)',
            [title, date, time]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除日程 (虽然目前前端主要联动删除，但提供 API 备用)
app.delete('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM events WHERE id = ?', [id]);
        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Memos API ---

// 获取备忘录
app.get('/api/memos', async (req, res) => {
    try {
        // 修改为 ASC (旧的在前，新的在后)，保持和前端 push 的顺序一致
        const [rows] = await db.query('SELECT * FROM memos ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 添加备忘录
app.post('/api/memos', async (req, res) => {
    const { content } = req.body;
    try {
        const [result] = await db.query('INSERT INTO memos (content) VALUES (?)', [content]);
        res.status(201).json({ id: result.insertId, content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 更新备忘录
app.put('/api/memos/:id', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    try {
        await db.query('UPDATE memos SET content = ? WHERE id = ?', [content, id]);
        res.json({ message: 'Memo updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除备忘录
app.delete('/api/memos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM memos WHERE id = ?', [id]);
        res.json({ message: 'Memo deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Chat API ---

// 获取聊天记录 (最近 50 条)
app.get('/api/chat', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT 50');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 添加聊天记录
app.post('/api/chat', async (req, res) => {
    const { role, content } = req.body;
    try {
        const [result] = await db.query('INSERT INTO chat_messages (role, content) VALUES (?, ?)', [role, content]);
        res.status(201).json({ id: result.insertId, role, content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AI Proxy API ---
app.post('/api/ai', async (req, res) => {
    const { messages, model, ...otherParams } = req.body;
    
    try {
        const response = await fetch(config.AI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.AI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.AI_MODEL,
                messages: messages,
                ...otherParams
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('AI Proxy Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


