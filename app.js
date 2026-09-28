/**
 * KM-Corporate MVP v1
 * Структура: Auth -> Profile List -> Chat Interface
 */

// --- 1. КОНФИГУРАЦИЯ ---
const CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co', // ЗАМЕНИТЬ!
  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY_HERE',             // ЗАМЕНИТЬ!
  APP_NAME: 'KM Connect'
};

// --- 2. БИБЛИОТЕКИ И ИНИЦИАЛИЗАЦИЯ ---
let sb = null;
let currentUser = null;
let currentChatWith = null; // ID собеседника

async function initLibraries() {
  return new Promise((resolve) => {
    if (window.supabase) resolve();
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

async function initApp() {
  await initLibraries();
  
  try {
    sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('✅ Supabase Connected');
    
    // Проверка авторизации
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      currentUser = session.user;
      loadUserProfile();
    } else {
      showLoginScreen();
    }
  } catch (e) {
    console.error('❌ Init Error:', e);
    alert('Ошибка подключения к базе данных. Проверь URL и Key в CONFIG.');
  }
}

// --- 3. СЛОЙ ДАННЫХ (API) ---

async function login(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentUser = data.user;
  loadUserProfile();
}

async function register(fullName, email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  
  // Создаем профиль сразу после регистрации
  if (data.user) {
    await sb.from('profiles').insert([
      { id: data.user.id, full_name: fullName, role: 'employee', status: 'online' }
    ]);
    currentUser = data.user;
    loadUserProfile();
  }
}

async function getColleagues() {
  // Получаем список всех, кроме себя
  const { data, error } = await sb.from('profiles')
    .select('*')
    .neq('id', currentUser.id);
  
  if (error) { console.error(error); return []; }
  return data || [];
}

async function sendMessage(receiverId, content) {
  const { error } = await sb.from('messages').insert([
    { sender_id: currentUser.id, receiver_id: receiverId, content }
  ]);
  if (error) console.error('Send Error:', error);
}

async function getMessages(peerId) {
  // История сообщений между мной и peerId
  const { data, error } = await sb.from('messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${currentUser.id})`)
    .order('created_at', { ascending: true });
  
  if (error) { console.error(error); return []; }
  return data || [];
}

// --- 4. UI КОМПОНЕНТЫ (Vanilla JS Renderers) ---

function render(html) {
  const app = document.getElementById('app');
  if (!app) {
    const div = document.createElement('div');
    div.id = 'app';
    document.body.appendChild(div);
  }
  document.getElementById('app').innerHTML = html;
}

function showLoginScreen() {
  render(`
    <style>
      body { font-family: system-ui, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .login-card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; }
      input { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
      button { width: 100%; padding: 12px; background: #007aff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 10px; }
      button:hover { background: #005bb5; }
      .link { text-align: center; margin-top: 15px; font-size: 14px; color: #007aff; cursor: pointer; }
      h2 { margin-top: 0; text-align: center; }
    </style>
    <div class="login-card">
      <h2>${CONFIG.APP_NAME}</h2>
      <form id="loginForm">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="pass" placeholder="Пароль" required>
        <button type="submit">Войти</button>
      </form>
      <div class="link" onclick="toggleRegister()">Нет аккаунта? Зарегистрироваться</div>
    </div>
  `);

  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await login(document.getElementById('email').value, document.getElementById('pass').value);
    } catch (err) {
      alert(err.message);
    }
  };
}

window.toggleRegister = function() {
  render(`
    <style>
      body { font-family: system-ui, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .login-card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; }
      input { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
      button { width: 100%; padding: 12px; background: #34c759; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 10px; }
      .link { text-align: center; margin-top: 15px; font-size: 14px; color: #007aff; cursor: pointer; }
      h2 { margin-top: 0; text-align: center; }
    </style>
    <div class="login-card">
      <h2>Регистрация</h2>
      <form id="regForm">
        <input type="text" id="name" placeholder="ФИО" required>
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="pass" placeholder="Пароль" required>
        <button type="submit">Создать аккаунт</button>
      </form>
      <div class="link" onclick="showLoginScreen()">Уже есть аккаунт?</div>
    </div>
  `);

  document.getElementById('regForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await register(
        document.getElementById('name').value,
        document.getElementById('email').value,
        document.getElementById('pass').value
      );
    } catch (err) {
      alert(err.message);
    }
  };
};

async function loadUserProfile() {
  // Загружаем мои данные из профиля
  const { data, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  if (error) { console.warn("Profile missing, creating..."); } 
  
  // Переходим в главный экран
  showMainInterface(data || { full_name: 'User', role: 'employee' });
}

function showMainInterface(profile) {
  // Layout: Sidebar (Contacts) + Main Area (Chat or Welcome)
  render(`
    <style>
      :root { --primary: #007aff; --bg: #ffffff; --sidebar-bg: #f9fafb; --border: #e5e7eb; --text: #1f2937; --muted: #6b7280; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, sans-serif; height: 100vh; overflow: hidden; display: flex; color: var(--text); }
      
      /* Sidebar */
      .sidebar { width: 300px; background: var(--sidebar-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
      .header { padding: 20px; border-bottom: 1px solid var(--border); }
      .header h3 { margin: 0; font-size: 18px; }
      .header small { color: var(--muted); }
      .contacts-list { flex: 1; overflow-y: auto; }
      .contact-item { padding: 15px 20px; cursor: pointer; border-bottom: 1px solid #eee; transition: 0.2s; display: flex; gap: 10px; align-items: center; }
      .contact-item:hover { background: #eff6ff; }
      .contact-item.active { background: #dbeafe; border-left: 4px solid var(--primary); }
      .avatar { width: 40px; height: 40px; border-radius: 50%; background: #ccc; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
      .info { flex: 1; }
      .name { font-weight: 600; font-size: 14px; }
      .role { font-size: 12px; color: var(--muted); }

      /* Main Chat Area */
      .main-area { flex: 1; display: flex; flex-direction: column; background: white; }
      .chat-header { padding: 15px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
      .chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #fcfcfc; }
      .msg { max-width: 70%; padding: 10px 15px; border-radius: 18px; font-size: 14px; line-height: 1.4; position: relative; }
      .msg.me { align-self: flex-end; background: var(--primary); color: white; border-bottom-right-radius: 4px; }
      .msg.other { align-self: flex-start; background: #e5e7eb; color: black; border-bottom-left-radius: 4px; }
      .msg-time { font-size: 10px; opacity: 0.7; margin-top: 4px; display: block; text-align: right; }
      
      .input-area { padding: 15px 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; }
      .input-area input { flex: 1; padding: 12px; border: 1px solid var(--border); border-radius: 24px; outline: none; }
      .input-area button { padding: 0 20px; background: var(--primary); color: white; border: none; border-radius: 24px; cursor: pointer; font-weight: bold; }
      
      .welcome { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 18px; }
      .logout-btn { background: none; border: 1px solid var(--border); padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; color: var(--muted); }
      .logout-btn:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
    </style>
    
    <div class="sidebar">
      <div class="header">
        <h3>${profile.full_name || 'Я'}</h3>
        <small>${profile.role === 'admin' ? 'Администратор' : 'Сотрудник'}</small>
      </div>
      <div class="contacts-list" id="contactsList">
        <!-- Contacts will be injected here -->
        <div style="padding:20px; text-align:center; color:#999;">Загрузка...</div>
      </div>
      <div style="padding:10px; border-top:1px solid var(--border);">
         <button class="logout-btn" onclick="handleLogout()">Выйти</button>
      </div>
    </div>

    <div class="main-area" id="mainArea">
      <div class="welcome">Выберите собеседника слева</div>
    </div>
  `);

  loadContacts();
}

async function loadContacts() {
  const colleagues = await getColleagues();
  const listEl = document.getElementById('contactsList');
  listEl.innerHTML = '';

  if (colleagues.length === 0) {
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Нет других пользователей</div>';
    return;
  }

  colleagues.forEach(col => {
    const initials = col.full_name ? col.full_name.split(' ').map(n=>n[0]).join('').substring(0,2) : '?';
    const item = document.createElement('div');
    item.className = 'contact-item';
    item.dataset.id = col.id;
    item.innerHTML = `
      <div class="avatar">${initials}</div>
      <div class="info">
        <div class="name">${col.full_name || 'Без имени'}</div>
        <div class="role">${col.department || col.role}</div>
      </div>
    `;
    item.onclick = () => openChat(col.id, col.full_name);
    listEl.appendChild(item);
  });
}

async function openChat(peerId, peerName) {
  currentChatWith = peerId;
  
  // Highlight active contact
  document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.querySelector(`.contact-item[data-id="${peerId}"]`);
  if(activeEl) activeEl.classList.add('active');

  const mainArea = document.getElementById('mainArea');
  mainArea.innerHTML = `
    <div class="chat-header">
      <div><strong>${peerName}</strong></div>
      <small>Личный чат</small>
    </div>
    <div class="chat-messages" id="messageContainer"></div>
    <div class="input-area">
      <input type="text" id="msgInput" placeholder="Напишите сообщение..." autocomplete="off">
      <button onclick="handleSend()">➤</button>
    </div>
  `;

  // Load history
  const msgs = await getMessages(peerId);
  const container = document.getElementById('messageContainer');
  container.innerHTML = '';
  msgs.forEach(m => appendMessageToDOM(m, false));

  // Setup Enter key send
  document.getElementById('msgInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // Subscribe to Realtime updates for this specific chat pair
  subscribeToRealtime(peerId);
}

function appendMessageToDOM(msg, animate = true) {
  const container = document.getElementById('messageContainer');
  if (!container) return;

  const isMe = msg.sender_id === currentUser.id;
  const dateStr = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  const div = document.createElement('div');
  div.className = `msg ${isMe ? 'me' : 'other'}`;
  div.style.opacity = animate ? '0' : '1';
  if(animate) {
    setTimeout(() => div.style.transition = 'opacity 0.3s', 10);
    setTimeout(() => div.style.opacity = '1', 20);
  }
  
  div.innerHTML = `
    ${msg.content}
    <span class="msg-time">${dateStr}</span>
  `;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

window.handleSend = async function() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text || !currentChatWith) return;

  input.value = '';
  await sendMessage(currentChatWith, text);
  // Message will appear via Realtime subscription usually, but let's force add for instant feedback if realtime lags
  // Actually, relying on Realtime is cleaner. If it doesn't fire immediately, we might need optimistic update.
  // For MVP, let's assume Realtime works fast enough.
};

let channel = null;
function subscribeToRealtime(peerId) {
  if (channel) {
    sb.removeChannel(channel);
  }

  channel = sb.channel(`room-${currentUser.id}-${peerId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${peerId},receiver_id=eq.${currentUser.id}` }, 
      (payload) => {
        // Incoming message from other person
        appendMessageToDOM(payload.new);
      }
    )
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUser.id},receiver_id=eq.${peerId}` }, 
      (payload) => {
        // My own message sent from another tab/device (optional sync)
        // Usually we ignore our own local sends, but good for multi-device
      }
    )
    .subscribe();
}

window.handleLogout = async function() {
  await sb.auth.signOut();
  location.reload();
};

// --- START ---
initApp();