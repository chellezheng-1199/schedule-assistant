// 数据存储 (作为前端缓存)
const state = {
    todos: [],
    events: [],
    memos: [],
    currentDate: new Date(),
    currentSort: 'deadline' // 默认排序方式
};

// AI 配置
const AI_CONFIG = {
    API_URL: '/api/ai'
};

// 聊天历史上下文
let chatHistory = [];

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    state.currentDate = new Date();
    
    // 设置下拉菜单的初始值
    const sortSelect = document.getElementById('todo-sort');
    if (sortSelect) sortSelect.value = state.currentSort;

    // 并行加载所有数据
    await Promise.all([
        initTodoModule(),
        initCalendarModule(),
        initMemoModule(),
        initAiModule() // AI 初始化也放在这里，等待历史记录加载
    ]);
});

// --- API 交互辅助函数 ---
async function apiCall(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(url, options);
    if (!res.ok) {
        let errorMsg = res.statusText;
        try {
            const errData = await res.json();
            if (errData.error) errorMsg = errData.error;
            else if (errData.message) errorMsg = errData.message;
        } catch (e) {}
        throw new Error(errorMsg);
    }
    // DELETE 方法有时可能返回空内容，但也可能返回 json
    if (res.status === 204) return {}; 
    return res.json();
}

// --- 1. 待办事项模块 ---
async function initTodoModule() {
    await fetchTodos();
    
    const addBtn = document.getElementById('add-todo-btn');
    if (addBtn) addBtn.addEventListener('click', addTodo);
    
    const sortSelect = document.getElementById('todo-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.currentSort = e.target.value; 
            sortTodos(state.currentSort);
        });
    }
}

async function fetchTodos() {
    try {
        state.todos = await apiCall('/api/todos');
        sortTodos(state.currentSort); // 排序并渲染
        renderWeek(); // 同时也刷新周历
    } catch (e) {
        console.error('Failed to fetch todos:', e);
    }
}

function renderTodos() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    state.todos.forEach(todo => {
        const item = document.createElement('div');
        item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        
        const daysLeft = getDaysLeft(todo.deadline);
        
        // 【修改】如果已经过期（daysLeft < 0），则不显示在待办列表中（但仍会在周历中显示）
        if (daysLeft < 0) return;

        let daysText = '';
        let countdownClass = 'countdown-normal';

        if (daysLeft < 0) {
            daysText = '已过期';
            countdownClass = 'countdown-urgent';
        } else if (daysLeft === 0) {
            daysText = '今天';
            countdownClass = 'countdown-urgent';
        } else if (daysLeft <= 2) {
            daysText = `${daysLeft}天后`;
            countdownClass = 'countdown-soon';
        } else {
            daysText = `${daysLeft}天后`;
            countdownClass = 'countdown-normal';
        }
        
        item.innerHTML = `
            <span class="priority-tag priority-${todo.priority}" ondblclick="editTodoPriority(${todo.id}, this)">${getPriorityLabel(todo.priority)}</span>
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
            <div class="todo-text" title="${todo.text} (双击编辑)" ondblclick="editTodoText(${todo.id}, this)">${todo.text}</div>
            <div class="todo-countdown ${countdownClass}" ondblclick="editTodoDate(${todo.id}, this)" title="双击修改日期">${daysText}</div>
            <button class="icon-btn delete-btn" onclick="deleteTodo(${todo.id})"><i class="fas fa-trash"></i></button>
        `;
        listEl.appendChild(item);
    });
    
    // 每次渲染待办时也更新周历，因为待办会显示在周历里
    renderWeek();
}

function getDaysLeft(deadlineStr) {
    if (!deadlineStr) return 0;
    // 处理可能的日期格式差异 (YYYY-MM-DD vs ISO String)
    const dStr = deadlineStr.includes('T') ? deadlineStr.split('T')[0] : deadlineStr;
    const deadlineParts = dStr.split('-');
    const deadline = new Date(deadlineParts[0], deadlineParts[1] - 1, deadlineParts[2]);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = deadline - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getPriorityLabel(p) {
    const map = { high: '高', medium: '中', low: '低' };
    return map[p] || '无';
}

async function addTodo() {
    const textInput = document.getElementById('new-todo-text');
    const dateInput = document.getElementById('new-todo-date');
    const priorityInput = document.getElementById('new-todo-priority');
    
    if (!textInput || !dateInput || !priorityInput) return;
    
    const text = textInput.value;
    const date = dateInput.value;
    const priority = priorityInput.value;
    
    if (!text) return alert('请输入待办事项内容');
    
    let deadlineStr = date;
    if (!deadlineStr) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        deadlineStr = `${year}-${month}-${day}`;
    }
    
    try {
        const newTodo = await apiCall('/api/todos', 'POST', {
            text,
            deadline: deadlineStr,
            priority,
            completed: false
        });
        
        state.todos.push(newTodo);
        textInput.value = '';
        sortTodos(state.currentSort);
    } catch (e) {
        alert('添加失败: ' + e.message);
    }
}

async function toggleTodo(id) {
    const todo = state.todos.find(t => t.id === id);
    if (todo) {
        const newStatus = !todo.completed;
        try {
            await apiCall(`/api/todos/${id}`, 'PUT', { completed: newStatus });
            todo.completed = newStatus;
            // 状态改变后，重新执行排序以实现“沉底”效果
            sortTodos(state.currentSort);
        } catch (e) {
            console.error('Toggle failed:', e);
            alert('更新状态失败');
        }
    }
}

async function deleteTodo(id) {
    if (confirm("确定要删除这条待办事项吗？")) {
        try {
            await apiCall(`/api/todos/${id}`, 'DELETE');
            state.todos = state.todos.filter(t => t.id !== id);
            renderTodos();
        } catch (e) {
            alert('删除失败: ' + e.message);
        }
    }
}

// --- 双击编辑功能 ---
window.editTodoText = function(id, element) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    const currentText = todo.text;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.width = '100%';
    input.style.border = '1px solid #4a90e2';
    input.style.borderRadius = '4px';
    input.style.padding = '4px';
    
    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
    
    const save = async () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
            try {
                await apiCall(`/api/todos/${id}`, 'PUT', { text: newText });
                todo.text = newText;
            } catch (e) {
                alert('更新失败');
            }
        }
        renderTodos();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') input.blur();
    });
    input.addEventListener('dblclick', (e) => e.stopPropagation());
};

window.editTodoPriority = function(id, element) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    const currentPriority = todo.priority;
    const select = document.createElement('select');
    select.innerHTML = `
        <option value="high" ${currentPriority === 'high' ? 'selected' : ''}>高</option>
        <option value="medium" ${currentPriority === 'medium' ? 'selected' : ''}>中</option>
        <option value="low" ${currentPriority === 'low' ? 'selected' : ''}>低</option>
    `;
    select.style.fontSize = '0.75rem';
    
    element.className = ''; 
    element.innerHTML = '';
    element.appendChild(select);
    select.focus();
    
    const save = async () => {
        const newPriority = select.value;
        if (newPriority !== currentPriority) {
            try {
                await apiCall(`/api/todos/${id}`, 'PUT', { priority: newPriority });
                todo.priority = newPriority;
                if (state.currentSort === 'priority') {
                    sortTodos('priority');
                } else {
                    renderTodos();
                }
            } catch (e) {
                alert('更新优先级失败');
                renderTodos();
            }
        } else {
            renderTodos();
        }
    };

    select.addEventListener('blur', save);
    select.addEventListener('change', () => select.blur());
    select.addEventListener('click', (e) => e.stopPropagation());
};

window.editTodoDate = function(id, element) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    // 格式化当前日期给 input[type=date] 使用
    const dStr = todo.deadline.includes('T') ? todo.deadline.split('T')[0] : todo.deadline;
    
    const input = document.createElement('input');
    input.type = 'date';
    input.value = dStr;
    input.style.fontSize = '0.8rem';
    input.style.width = '110px';
    
    element.innerHTML = '';
    element.className = ''; 
    element.appendChild(input);
    input.focus();
    try { input.showPicker(); } catch(e) {}
    
    const save = async () => {
        const newDate = input.value;
        if (newDate && newDate !== dStr) {
            try {
                await apiCall(`/api/todos/${id}`, 'PUT', { deadline: newDate });
                todo.deadline = newDate;
                if (state.currentSort === 'deadline') {
                    sortTodos('deadline');
                } else {
                    renderTodos();
                }
            } catch (e) {
                alert('更新日期失败');
                renderTodos();
            }
        } else {
            renderTodos();
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') input.blur();
    });
    input.addEventListener('click', (e) => e.stopPropagation());
};


function sortTodos(criteria) {
    // 优先级数值映射
    const pVal = { high: 3, medium: 2, low: 1 };
    
    // 辅助函数：解析日期字符串为本地 Date 对象（与 getDaysLeft 保持一致）
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date(8640000000000000); // 无日期视为最远未来
        const s = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = s.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    state.todos.sort((a, b) => {
        // 1. 强制转换完成状态为布尔值进行比较
        const isCompletedA = Boolean(a.completed);
        const isCompletedB = Boolean(b.completed);

        // 完成状态不同：未完成在前 (false)，已完成在后 (true)
        if (isCompletedA !== isCompletedB) {
            return isCompletedA ? 1 : -1;
        }

        // 2. 两人完成状态相同（都是未完成，或都是已完成）-> 按规则排序
        if (criteria === 'deadline') {
            // 先按截止日期升序 (早 -> 晚)
            const dateA = parseDate(a.deadline);
            const dateB = parseDate(b.deadline);
            // 使用 getTime() 比较数值
            const timeDiff = dateA.getTime() - dateB.getTime();
            if (timeDiff !== 0) return timeDiff;
            
            // 截止日期相同（同一天），按优先级降序（高 > 中 > 低）
            return pVal[b.priority] - pVal[a.priority];

        } else if (criteria === 'priority') {
            // 先按优先级降序
            const pDiff = pVal[b.priority] - pVal[a.priority];
            if (pDiff !== 0) return pDiff;
            
            // 优先级相同，按截止日期升序
            const dateA = parseDate(a.deadline);
            const dateB = parseDate(b.deadline);
            return dateA.getTime() - dateB.getTime();
        }
        return 0;
    });

    renderTodos();
}

window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;


// --- 2. 周历模块 ---
async function initCalendarModule() {
    await fetchEvents();
    renderWeek();
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');
    if (prevBtn) prevBtn.addEventListener('click', () => changeWeek(-7));
    if (nextBtn) nextBtn.addEventListener('click', () => changeWeek(7));
}

async function fetchEvents() {
    try {
        state.events = await apiCall('/api/events');
        renderWeek();
    } catch (e) {
        console.error('Failed to fetch events:', e);
    }
}

function renderWeek() {
    const grid = document.getElementById('week-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const startOfWeek = getStartOfWeek(state.currentDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const label = document.getElementById('current-week-label');
    if (label) {
        label.textContent = `${startOfWeek.getFullYear()}年 ${startOfWeek.getMonth()+1}月 ${startOfWeek.getDate()}日 - ${endOfWeek.getMonth()+1}月 ${endOfWeek.getDate()}日`;
    }

    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        
        const year = currentDay.getFullYear();
        const month = String(currentDay.getMonth() + 1).padStart(2, '0');
        const day = String(currentDay.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const dayEvents = state.events.filter(e => e.date === dateStr).map(e => ({
            ...e,
            type: 'event',
            priorityScore: 100, 
            isCompleted: false
        }));
        
        const dayTodos = state.todos.filter(t => {
            const tDate = t.deadline.includes('T') ? t.deadline.split('T')[0] : t.deadline;
            return tDate === dateStr;
        }).map(t => ({
            ...t,
            title: t.text,
            type: 'todo',
            priorityScore: getPriorityScore(t.priority),
            isCompleted: t.completed
        }));

        // 3. 合并并排序
        const allItems = [...dayEvents, ...dayTodos].sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1; 
            if (a.type === 'event' && b.type === 'event') return a.time.localeCompare(b.time);
            return b.priorityScore - a.priorityScore; 
        });
        
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const isToday = dateStr === todayStr;

        const column = document.createElement('div');
        column.className = `day-column ${isToday ? 'today' : ''}`;
        
        const eventsHtml = allItems.map(item => `
            <div class="calendar-event ${item.type === 'todo' ? `todo-${item.priority}` : 'event-type-event'} ${item.isCompleted ? 'completed' : ''}" 
                 title="${item.title}">
                <span>${item.time ? `<b>${item.time}</b> ` : ''}${item.title}</span>
            </div>
        `).join('');

        column.innerHTML = `
            <div class="day-header">
                <div>${weekDays[currentDay.getDay()]}</div>
                <div>${currentDay.getDate()}</div>
            </div>
            <div class="day-events">
                ${eventsHtml}
            </div>
        `;
        grid.appendChild(column);
    }
}

function getPriorityScore(p) {
    const map = { high: 3, medium: 2, low: 1 };
    return map[p] || 0;
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function changeWeek(days) {
    state.currentDate.setDate(state.currentDate.getDate() + days);
    renderWeek();
}


// --- 3. AI 助手模块 ---
async function initAiModule() {
    // 1. 加载历史记录
    await fetchChatHistory();

    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send-btn');
    
    const handleSend = async () => {
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        
        // 2. 显示并保存用户消息
        addMessage(text, 'user');
        await saveChatMessage('user', text); // 等待保存，确保顺序
        
        input.value = '';
        
        const loadingMsg = addMessage('正在思考...', 'ai');
        
        try {
            await processAIWithLLM(text, loadingMsg);
        } catch (error) {
            console.error('AI Error:', error);
            loadingMsg.textContent = `抱歉，连接出错了: ${error.message}`;
        }
    };
    
    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (input) input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

async function fetchChatHistory() {
    try {
        const history = await apiCall('/api/chat');
        const container = document.getElementById('chat-container');
        if (!container) return;
        container.innerHTML = ''; // 清空当前
        
        // 如果没有历史记录，显示默认欢迎语
        if (history.length === 0) {
            addMessage('你好！我是你的日程助手。告诉我你的计划，我会帮你安排。', 'ai', false);
        } else {
            // 渲染历史消息
            history.forEach(msg => {
                addMessage(msg.content, msg.role === 'user' ? 'user' : 'ai', false); // false 表示不用再保存
            });
        }
        
        // 更新内存中的上下文，供 LLM 使用
        chatHistory = history.map(msg => ({ role: msg.role === 'ai' ? 'assistant' : msg.role, content: msg.content }));
    } catch (e) {
        console.error('Failed to fetch chat history:', e);
    }
}

async function saveChatMessage(role, content) {
    try {
        // DB 中 role 存 'user' 或 'assistant'，前端 CSS类名用 'ai-message'
        const dbRole = role === 'ai' ? 'assistant' : role;
        await apiCall('/api/chat', 'POST', { role: dbRole, content });
    } catch (e) {
        console.error('Failed to save chat message:', e);
    }
}

function addMessage(text, sender, scrollToBottom = true) {
    const container = document.getElementById('chat-container');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = `message ${sender}-message`;
    msg.textContent = text;
    container.appendChild(msg);
    if (scrollToBottom) container.scrollTop = container.scrollHeight;
    return msg;
}

// 核心大模型调用逻辑
async function processAIWithLLM(userText, loadingMsgElement) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];

    const systemPrompt = `你是一个智能日程助手，当前时间是 ${todayStr} (${weekDay})。
你的任务是陪用户聊天，并帮助管理日程。

**核心规则：**
如果用户的话中包含了**日期/时间**和**事件**（例如“明天开会”、“31号跨年”），**请务必自动帮用户安排**，不要只是口头答应！
请**严格**按照以下特殊格式在回复的最后一行输出指令（不要使用代码块）。

1. 添加待办指令格式：
:::ADD_TODO|内容|YYYY-MM-DD|priority:::
(priority 只能是 high, medium, low)

2. 添加日程指令格式：
:::ADD_EVENT|标题|YYYY-MM-DD|HH:mm:::
(如果用户没说具体时间，日程默认设为 09:00)

例如：
用户：明天上午10点提醒我开会
回复：好的，已为您安排明天上午10点的会议。
:::ADD_EVENT|开会|2025-12-11|10:00:::

用户：31号跨年
回复：收到！已添加跨年日程。
:::ADD_EVENT|跨年|2025-12-31|20:00:::

用户：后天记得买菜(重要)
回复：没问题，已添加买菜待办。
:::ADD_TODO|买菜|2025-12-12|high:::

如果只是纯闲聊（如“你好”、“讲个笑话”），则正常回复，不要输出指令。`;

    chatHistory.push({ role: 'user', content: userText });
    if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

    const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory
    ];

    const response = await fetch(AI_CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: messages,
            stream: false,
            max_tokens: 512,
            temperature: 0.7,
            top_p: 0.7,
            top_k: 50,
            frequency_penalty: 0.5
        })
    });

    if (!response.ok) {
        let errorMsg = `Status ${response.status}`;
        try {
            const errData = await response.json();
            if (errData && errData.message) errorMsg = errData.message;
            else if (errData && errData.error && errData.error.message) errorMsg = errData.error.message;
        } catch(e) {}
        throw new Error(errorMsg);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const content = choice.message.content;

    chatHistory.push({ role: 'assistant', content: content });

    // 解析指令
    const commandRegex = /:::(ADD_TODO|ADD_EVENT)\|(.*?):::/g;
    const matches = [...content.matchAll(commandRegex)];
    let displayContent = content.replace(commandRegex, '').trim(); 
    
    if (displayContent) {
        loadingMsgElement.textContent = displayContent;
        // 保存 AI 的回复 (去除指令后的自然语言)
        // 使用 await 确保在下一步操作前保存完成，减少刷新丢失风险
        await saveChatMessage('ai', displayContent);
    } else {
        if (matches.length > 0) {
            loadingMsgElement.remove();
            // 如果只有指令，不保存这条空消息
        } else {
            loadingMsgElement.textContent = content; 
            await saveChatMessage('ai', content);
        }
    }

    // 执行指令
    if (matches.length > 0) {
        for (const match of matches) {
            const type = match[1];
            const params = match[2].split('|');
            
            if (type === 'ADD_TODO') {
                const [text, date, priority] = params;
                await executeAddTodo({
                    text: text,
                    date: date,
                    priority: priority || 'medium'
                });
                addMessage(`✅ 已添加待办：${text}`, 'ai');
            } else if (type === 'ADD_EVENT') {
                const [title, date, time] = params;
                await executeAddEvent({
                    title: title,
                    date: date,
                    time: time
                });
                addMessage(`📅 已安排日程：${title} (${date} ${time})`, 'ai');
            }
        }
    }
}

// 本地执行添加待办 (异步 API)
async function executeAddTodo(args) {
    try {
        const newTodo = await apiCall('/api/todos', 'POST', {
            text: args.text,
            deadline: args.date,
            priority: args.priority,
            completed: false
        });
        state.todos.push(newTodo);
        sortTodos(state.currentSort);
    } catch (e) {
        console.error("AI Add Todo Error", e);
    }
}

// 本地执行添加日程 (异步 API)
async function executeAddEvent(args) {
    try {
        const newEvent = await apiCall('/api/events', 'POST', {
            title: args.title,
            date: args.date,
            time: args.time
        });
        state.events.push(newEvent);
        renderWeek();
    } catch (e) {
        console.error("AI Add Event Error", e);
    }
}


// --- 4. 备忘录模块 ---
async function initMemoModule() {
    await fetchMemos();
    const addBtn = document.getElementById('add-memo-btn');
    if (addBtn) addBtn.addEventListener('click', addMemo);
}

async function fetchMemos() {
    try {
        state.memos = await apiCall('/api/memos');
        // 强制前端按 ID 正序排列 (旧 -> 新)，确保和 push 行为一致
        state.memos.sort((a, b) => a.id - b.id);
        renderMemos();
    } catch (e) {
        console.error('Failed to fetch memos:', e);
    }
}

function renderMemos() {
    const list = document.getElementById('memo-list');
    if (!list) return;
    list.innerHTML = '';
    
    state.memos.forEach(memo => {
        const card = document.createElement('div');
        card.className = 'memo-card';
        card.innerHTML = `
            <textarea class="memo-content" onchange="updateMemo(${memo.id}, this.value)">${memo.content}</textarea>
            <div class="memo-footer">
                <i class="fas fa-trash memo-delete" onclick="deleteMemo(${memo.id})"></i>
            </div>
        `;
        list.appendChild(card);
    });
}

async function addMemo() {
    try {
        const newMemo = await apiCall('/api/memos', 'POST', { content: '' });
        state.memos.push(newMemo);
        renderMemos();
    } catch (e) {
        alert('添加备忘录失败');
    }
}

window.updateMemo = async function(id, content) {
    const memo = state.memos.find(m => m.id === id);
    if (memo) {
        try {
            await apiCall(`/api/memos/${id}`, 'PUT', { content });
            memo.content = content;
        } catch (e) {
            console.error('Memo update failed');
        }
    }
}

window.deleteMemo = async function(id) {
    if (confirm("确定要删除这条备忘录吗？")) {
        try {
            await apiCall(`/api/memos/${id}`, 'DELETE');
            state.memos = state.memos.filter(m => m.id !== id);
            renderMemos();
        } catch (e) {
            alert('删除备忘录失败');
        }
    }
}
