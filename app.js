cat << 'ENDOFFILE' > /mnt/user-data/outputs/app.js
// ── FIREBASE UTILITY SETUP ──
const firebaseConfig = {
  apiKey:            "AIzaSyAVCLcRZXQvUvvDm1L20TCY_GPwlX0btfg",
  authDomain:        "food-keeper-e2b1c.firebaseapp.com",
  projectId:         "food-keeper-e2b1c",
  storageBucket:     "food-keeper-e2b1c.firebasestorage.app",
  messagingSenderId: "294763992382",
  appId:             "1:294763992382:web:694f9d846b881b3a75886f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── TRANSLATIONS ──
const TRANSLATIONS = {
  en: {
    pantry: '🥦 Pantry',
    shopping: '🛒 Shopping List',
    waste: '🗑️ Waste Log',
    recipes: '🍳 Recipes For You',
    receipt: '🧾 Scan Receipt',
    leaderboard: '🏆 Leaderboard',
    awareness: '🌍 Awareness',
    quiz: '📝 Quiz',
    totalItems: 'Total Items',
    expired: 'Expired',
    expiringSoon: 'Expiring Soon',
    monthlyWaste: 'Monthly Waste',
    addItem: '➕ Add Item',
    searchPlaceholder: 'Search ingredients...',
    logOut: 'Log Out',
  },
  ms: {
    pantry: '🥦 Pantri',
    shopping: '🛒 Senarai Belanja',
    waste: '🗑️ Log Pembaziran',
    recipes: '🍳 Resipi Untuk Anda',
    receipt: '🧾 Imbas Resit',
    leaderboard: '🏆 Papan Kedudukan',
    awareness: '🌍 Kesedaran',
    quiz: '📝 Kuiz',
    totalItems: 'Jumlah Item',
    expired: 'Tamat Tempoh',
    expiringSoon: 'Hampir Tamat',
    monthlyWaste: 'Pembaziran Bulanan',
    addItem: '➕ Tambah Item',
    searchPlaceholder: 'Cari bahan...',
    logOut: 'Log Keluar',
  },
  zh: {
    pantry: '🥦 食品储藏',
    shopping: '🛒 购物清单',
    waste: '🗑️ 浪费记录',
    recipes: '🍳 为你推荐食谱',
    receipt: '🧾 扫描收据',
    leaderboard: '🏆 排行榜',
    awareness: '🌍 意识提升',
    quiz: '📝 测验',
    totalItems: '总数',
    expired: '已过期',
    expiringSoon: '即将过期',
    monthlyWaste: '本月浪费',
    addItem: '➕ 添加食材',
    searchPlaceholder: '搜索食材...',
    logOut: '退出登录',
  }
};

let currentLang = 'en';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('fk_lang', lang);
  applyTranslations();
}

function applyTranslations() {
  const t = TRANSLATIONS[currentLang];
  const navViews = ['pantry','shopping','waste','recipes','receipt','leaderboard','awareness','quiz'];
  const navKeys  = ['pantry','shopping','waste','recipes','receipt','leaderboard','awareness','quiz'];
  navViews.forEach((v, i) => {
    const el = document.querySelector(`[data-view="${v}"]`);
    if (el) el.textContent = t[navKeys[i]];
  });
  const labels = document.querySelectorAll('.stat-label');
  if (labels[0]) labels[0].textContent = t.totalItems;
  if (labels[1]) labels[1].textContent = t.expired;
  if (labels[2]) labels[2].textContent = t.expiringSoon;
  if (labels[3]) labels[3].textContent = t.monthlyWaste;
  const searchEl = document.getElementById('search-input');
  if (searchEl) searchEl.placeholder = t.searchPlaceholder;
  const logoutEl = document.querySelector('.logout-btn');
  if (logoutEl) logoutEl.textContent = t.logOut;
  const langSel = document.getElementById('lang-select');
  if (langSel) langSel.value = currentLang;
}

function loadLanguage() {
  const saved = localStorage.getItem('fk_lang') || 'en';
  currentLang = saved;
  applyTranslations();
}

// ── FOOD EMOJIS ──
const EMOJIS = {
  fridge:  ['🥛','🥚','🧀','🥩','🥦','🥕','🍅','🫐','🍓','🥬','🫒','🥒','🌶️'],
  freezer: ['🍦','🥩','🐟','🥐','🍕','🧊','🦐','🥟','🍗'],
  pantry:  ['🍞','🥫','🧈','🌾','🫙','🍝','🧄','🧅','🥜','🍵','🫖','🥗']
};

const ALL_EMOJIS = [...new Set([...EMOJIS.fridge, ...EMOJIS.freezer, ...EMOJIS.pantry])];
const LOC_LABEL  = { fridge: 'Fridge', freezer: 'Freezer', pantry: 'Pantry' };
const LOC_ICON   = { fridge: '🧊', freezer: '❄️', pantry: '🗄️' };
const CAT_LABEL  = { dairy: 'Dairy', produce: 'Produce', meat: 'Meat', grain: 'Grain', other: 'Other' };
const CAT_ICON   = { dairy: '🥛', produce: '🥦', meat: '🥩', grain: '🌾', other: '📦' };

const ERROR_MAP = {
  'auth/invalid-email':           'Invalid email format',
  'auth/user-not-found':          'Account not found',
  'auth/wrong-password':          'Wrong password',
  'auth/email-already-in-use':    'Email already registered',
  'auth/weak-password':           'Password must be at least 6 characters',
  'auth/too-many-requests':       'Too many attempts, try later',
  'auth/invalid-credential':      'Email or password is incorrect',
};

// ── STATE ──
let foods       = [];
let shopItems   = [];
let wasteLog    = [];
let filter      = 'all';
let catFilter   = 'all';
let sortBy      = 'expiry';
let query       = '';
let currentView = 'pantry';
let unsubscribe = null;
let currentUser = null;
let editingId   = null;
let bulkMode    = false;
let selectedIds = new Set();
let notifDays   = 3;

// ── QUIZ STATE ──
const QUIZ_QUESTIONS = [
  { q: "What percentage of all food produced globally is wasted every year?", opts: ["10%","20%","33%","50%"], ans: 2 },
  { q: "Which of the 5Rs means to think carefully before buying food?", opts: ["Reduce","Reconsider","Refuse","Repair"], ans: 1 },
  { q: "What greenhouse gas does rotting food in landfills mainly produce?", opts: ["Carbon dioxide","Oxygen","Methane","Nitrogen"], ans: 2 },
  { q: "How much food waste does the average Malaysian household generate per year in value?", opts: ["RM200","RM400","RM624","RM1000"], ans: 2 },
  { q: "Which 5R means to say no to unnecessary food purchases?", opts: ["Reduce","Recycle","Refuse","Repair"], ans: 2 },
  { q: "What does 'Reduce' mean in the context of food waste?", opts: ["Buy less food than needed","Buy only what you need and consume fully","Throw food in recycling bins","Fix broken food containers"], ans: 1 },
  { q: "How many tonnes of food waste does Malaysia generate daily?", opts: ["5,000","17,000","50,000","100,000"], ans: 1 },
  { q: "Which 5R involves turning food scraps into compost?", opts: ["Repair","Reconsider","Recycle","Refuse"], ans: 2 },
  { q: "What is the FIRST step in reducing food waste at home?", opts: ["Buy more storage containers","Track what you already have","Cook larger portions","Buy food in bulk"], ans: 1 },
  { q: "Which of these is NOT a root cause of household food waste?", opts: ["No expiry tracking","Over-purchasing","Having too many containers","Poor storage awareness"], ans: 2 },
  { q: "What does 'Repair' mean in the 5R framework for food?", opts: ["Fix broken appliances","Extend the life of food through proper storage and preservation","Donate old food","Cook food again"], ans: 1 },
  { q: "Food waste accounts for approximately what percentage of global greenhouse gas emissions?", opts: ["2–3%","8–10%","15–20%","25–30%"], ans: 1 },
  { q: "Which storage method best preserves meat for long periods?", opts: ["Pantry","Fridge","Freezer","Room temperature"], ans: 2 },
  { q: "What does FIFO stand for in food storage?", opts: ["Food In, Food Out","First In, First Out","Fresh Items For Ordering","Freeze It For Others"], ans: 1 },
  { q: "Which 5R encourages you to think about whether you truly need a food item before purchasing?", opts: ["Reduce","Refuse","Recycle","Reconsider"], ans: 3 },
  { q: "Methane is how many times more potent than CO2 as a greenhouse gas over 20 years?", opts: ["10 times","40 times","80 times","200 times"], ans: 2 },
  { q: "Which organisation published the Food Waste Index Report 2024?", opts: ["WHO","FAO","UNEP","UNESCO"], ans: 2 },
  { q: "What is the best way to use vegetables that are about to expire?", opts: ["Throw them away","Make a soup or stir fry","Leave them and hope for the best","Buy new ones"], ans: 1 },
  { q: "Which 5R involves using leftover food packaging or containers creatively?", opts: ["Refuse","Reduce","Recycle","Repair"], ans: 2 },
  { q: "What does Food Keeper's Monthly Waste tracker record?", opts: ["Number of items added","Total Ringgit value of wasted food","Number of recipes generated","Shopping list length"], ans: 1 },
];

let quizCurrent = 0;
let quizScore   = 0;
let quizAnswered = false;

// ── LEADERBOARD ──
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function saveWeeklyWaste() {
  if (!currentUser) return;
  const uid    = currentUser.uid;
  const year   = new Date().getFullYear();
  const weekNum = getWeekNumber(new Date());
  const key    = `fk_leaderboard_${uid}_${year}`;

  const wastedThisWeek = wasteLog
    .filter(w => {
      const d = new Date(w.date);
      return getWeekNumber(d) === weekNum && d.getFullYear() === year;
    })
    .reduce((sum, w) => sum + (w.price || 0), 0);

  let board = JSON.parse(localStorage.getItem(key) || '[]');
  const existing = board.find(e => e.week === weekNum);
  if (existing) { existing.amount = wastedThisWeek; }
  else { board.push({ week: weekNum, amount: wastedThisWeek, year }); }
  localStorage.setItem(key, JSON.stringify(board));
}

function renderLeaderboard() {
  if (!currentUser) return;
  const uid  = currentUser.uid;
  const year = new Date().getFullYear();
  const key  = `fk_leaderboard_${uid}_${year}`;
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  saveWeeklyWaste();

  let board = JSON.parse(localStorage.getItem(key) || '[]');
  board.sort((a, b) => b.amount - a.amount);
  const top10 = board.slice(0, 10);

  if (top10.length === 0) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">🌱</div><p>No waste data yet — start tracking to see your leaderboard!</p></div>`;
    return;
  }

  const medals = ['🥇','🥈','🥉'];
  container.innerHTML = `
    <div class="leaderboard-year-badge">📅 ${year} — Resets every January</div>
    <div class="leaderboard-list">
      ${top10.map((entry, i) => `
        <div class="leaderboard-row ${i===0?'top-1':i===1?'top-2':i===2?'top-3':''}">
          <div class="lb-rank">${medals[i] || `#${i+1}`}</div>
          <div class="lb-info">
            <div class="lb-week">Week ${entry.week}</div>
            <div class="lb-year">${entry.year}</div>
          </div>
          <div class="lb-amount">RM ${entry.amount.toFixed(2)}</div>
        </div>
      `).join('')}
    </div>
    <div class="leaderboard-footer">Your top 10 worst weeks by food waste value this year.</div>
  `;
}

// ── QUIZ ──
function renderQuiz() {
  const container = document.getElementById('quiz-container');
  if (!container) return;

  const uid = currentUser?.uid;
  const bestScore = uid ? (parseInt(localStorage.getItem(`fk_quiz_best_${uid}`)) || 0) : 0;

  if (quizCurrent >= QUIZ_QUESTIONS.length) {
    if (uid) {
      const prev = parseInt(localStorage.getItem(`fk_quiz_best_${uid}`)) || 0;
      if (quizScore > prev) localStorage.setItem(`fk_quiz_best_${uid}`, quizScore);
    }
    const pct = Math.round((quizScore / QUIZ_QUESTIONS.length) * 100);
    const grade = pct >= 90 ? '🌟 Excellent!' : pct >= 70 ? '👍 Good Job!' : pct >= 50 ? '📚 Keep Learning!' : '💪 Try Again!';
    container.innerHTML = `
      <div class="quiz-result-card">
        <div class="quiz-result-icon">${grade.split(' ')[0]}</div>
        <h2 class="quiz-result-title">${grade.split(' ').slice(1).join(' ')}</h2>
        <div class="quiz-result-score">${quizScore} / ${QUIZ_QUESTIONS.length}</div>
        <div class="quiz-result-pct">${pct}% correct</div>
        <div class="quiz-best">🏅 Best Score: ${Math.max(quizScore, bestScore)} / ${QUIZ_QUESTIONS.length}</div>
        <button class="btn-primary" style="margin-top:20px; background:var(--accent); color:white;" onclick="restartQuiz()">Try Again</button>
      </div>
    `;
    return;
  }

  const q = QUIZ_QUESTIONS[quizCurrent];
  container.innerHTML = `
    <div class="quiz-header">
      <div class="quiz-progress-text">Question ${quizCurrent + 1} of ${QUIZ_QUESTIONS.length}</div>
      <div class="quiz-score-live">Score: ${quizScore}</div>
    </div>
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${((quizCurrent)/QUIZ_QUESTIONS.length)*100}%"></div></div>
    <div class="quiz-best-top">🏅 Best: ${bestScore} / ${QUIZ_QUESTIONS.length}</div>
    <div class="quiz-card">
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((opt, i) => `
          <button class="quiz-opt-btn" id="qopt-${i}" onclick="answerQuiz(${i})">
            <span class="quiz-opt-letter">${String.fromCharCode(65+i)}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div id="quiz-feedback" style="display:none;"></div>
    <button class="btn-primary" id="quiz-next-btn" style="display:none; margin-top:16px; background:var(--accent); color:white;" onclick="nextQuizQuestion()">
      ${quizCurrent + 1 === QUIZ_QUESTIONS.length ? 'See Results' : 'Next Question →'}
    </button>
  `;
}

function answerQuiz(selected) {
  if (quizAnswered) return;
  quizAnswered = true;
  const q = QUIZ_QUESTIONS[quizCurrent];
  const correct = q.ans;

  document.querySelectorAll('.quiz-opt-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add('correct');
    else if (i === selected) btn.classList.add('wrong');
  });

  const feedback = document.getElementById('quiz-feedback');
  if (selected === correct) {
    quizScore++;
    feedback.innerHTML = `<div class="quiz-feedback correct-fb">✅ Correct! Well done.</div>`;
  } else {
    feedback.innerHTML = `<div class="quiz-feedback wrong-fb">❌ Incorrect. The correct answer is <strong>${q.opts[correct]}</strong>.</div>`;
  }
  feedback.style.display = 'block';
  document.getElementById('quiz-next-btn').style.display = 'block';
}

function nextQuizQuestion() {
  quizCurrent++;
  quizAnswered = false;
  renderQuiz();
}

function restartQuiz() {
  quizCurrent  = 0;
  quizScore    = 0;
  quizAnswered = false;
  renderQuiz();
}

// ── AWARENESS ──
function renderAwareness() {
  const container = document.getElementById('awareness-container');
  if (!container) return;
  container.innerHTML = `

    <div class="awareness-hero">
      <div class="awareness-hero-icon">🌍</div>
      <h2 class="awareness-hero-title">The Food Waste Crisis</h2>
      <p class="awareness-hero-sub">Every year, one third of all food produced for human consumption is lost or wasted globally.</p>
    </div>

    <div class="awareness-stats-grid">
      <div class="awareness-stat-card red">
        <div class="awareness-stat-num">1/3</div>
        <div class="awareness-stat-label">Of all food produced globally is wasted every year</div>
      </div>
      <div class="awareness-stat-card amber">
        <div class="awareness-stat-num">17,000+</div>
        <div class="awareness-stat-label">Tonnes of food waste generated in Malaysia daily</div>
      </div>
      <div class="awareness-stat-card blue">
        <div class="awareness-stat-num">RM624</div>
        <div class="awareness-stat-label">Average annual food waste cost per Malaysian household</div>
      </div>
      <div class="awareness-stat-card green">
        <div class="awareness-stat-num">8–10%</div>
        <div class="awareness-stat-label">Of global greenhouse gas emissions come from food waste</div>
      </div>
    </div>

    <div class="awareness-section-title">⚠️ Why Food Waste is a Serious Problem</div>
    <div class="awareness-cards-grid">
      <div class="awareness-info-card">
        <div class="awareness-info-icon">💸</div>
        <h4>Financial Loss</h4>
        <p>Families spend money on food that is never consumed. Over a lifetime, this adds up to tens of thousands of ringgit wasted on groceries that ended up in the bin.</p>
      </div>
      <div class="awareness-info-card">
        <div class="awareness-info-icon">🌡️</div>
        <h4>Climate Change</h4>
        <p>When food rots in landfills without oxygen, it produces methane — a greenhouse gas 80 times more potent than CO₂ over 20 years. Food waste is a major driver of climate change.</p>
      </div>
      <div class="awareness-info-card">
        <div class="awareness-info-icon">🏔️</div>
        <h4>Landfill Burden</h4>
        <p>Food waste is one of the largest contributors to solid waste in Malaysia. Overflowing landfills pollute soil and groundwater and consume vast amounts of land.</p>
      </div>
      <div class="awareness-info-card">
        <div class="awareness-info-icon">💧</div>
        <h4>Wasted Resources</h4>
        <p>Every discarded item also wastes the water, energy, and land used to grow, transport, and store it. Wasting food means wasting everything it took to produce it.</p>
      </div>
      <div class="awareness-info-card">
        <div class="awareness-info-icon">🍽️</div>
        <h4>Food Insecurity</h4>
        <p>While food is wasted by some, millions face hunger. Reducing household waste is not just an environmental issue — it is a matter of social justice and responsibility.</p>
      </div>
      <div class="awareness-info-card">
        <div class="awareness-info-icon">🧒</div>
        <h4>Future Generations</h4>
        <p>Children who grow up in waste-conscious households carry those habits for life. Every small change at home contributes to a more sustainable future for the next generation.</p>
      </div>
    </div>

    <div class="awareness-section-title">♻️ The 5R Framework — What You Can Do</div>
    <div class="awareness-5r-grid">
      <div class="awareness-5r-card r1">
        <div class="r-num">1</div>
        <div class="r-letter">REFUSE</div>
        <div class="r-icon">🚫</div>
        <h4>Say No</h4>
        <p>Refuse to buy food you do not need. Avoid impulse purchases and promotional bundles that lead to overconsumption. Check your pantry before shopping.</p>
        <div class="r-tip">💡 Tip: Never shop when hungry — you will buy more than you need.</div>
      </div>
      <div class="awareness-5r-card r2">
        <div class="r-num">2</div>
        <div class="r-letter">REDUCE</div>
        <div class="r-icon">📉</div>
        <h4>Buy Less, Waste Less</h4>
        <p>Buy only what you will consume. Cook in smaller portions. Track expiry dates and use food before it spoils. Plan your meals for the week ahead.</p>
        <div class="r-tip">💡 Tip: A shopping list prevents over-purchasing. Food Keeper's Shopping List helps!</div>
      </div>
      <div class="awareness-5r-card r3">
        <div class="r-num">3</div>
        <div class="r-letter">RECYCLE</div>
        <div class="r-icon">♻️</div>
        <h4>Transform Waste</h4>
        <p>Turn food scraps into compost for plants. Recycle packaging materials. Use vegetable peels and bones to make stocks and broths instead of discarding them.</p>
        <div class="r-tip">💡 Tip: Composting food scraps reduces landfill methane emissions significantly.</div>
      </div>
      <div class="awareness-5r-card r4">
        <div class="r-num">4</div>
        <div class="r-letter">REPAIR</div>
        <div class="r-icon">🔧</div>
        <h4>Extend Food Life</h4>
        <p>Preserve food through proper storage, freezing, pickling, or fermenting. Revive slightly wilted vegetables with cold water. Store food correctly to extend its shelf life.</p>
        <div class="r-tip">💡 Tip: Move items expiring soon to the front of the fridge — you will see and use them first.</div>
      </div>
      <div class="awareness-5r-card r5">
        <div class="r-num">5</div>
        <div class="r-letter">RECONSIDER</div>
        <div class="r-icon">🤔</div>
        <h4>Think Before You Act</h4>
        <p>Reconsider every food decision. Do you actually need that second pack? Is that promotional deal worth it if half goes to waste? Make mindful choices every time.</p>
        <div class="r-tip">💡 Tip: Ask yourself — will I actually eat this before it expires?</div>
      </div>
    </div>

    <div class="awareness-cta">
      <div class="awareness-cta-icon">🌿</div>
      <h3>Ready to Make a Change?</h3>
      <p>Start tracking your food today with Food Keeper. Every item saved is money in your pocket and methane kept out of the atmosphere.</p>
      <button class="btn-primary" style="background:var(--accent); color:white; margin-top:12px; width:auto; padding:12px 28px;" onclick="switchView('pantry')">Go to My Pantry →</button>
    </div>
  `;
}

// ── TIME UTILS ──
function daysLeft(expiry) {
  const today = new Date(); today.setHours(0,0,0,0);
  const exp   = new Date(expiry); exp.setHours(0,0,0,0);
  return Math.round((exp - today) / 86400000);
}

function badgeInfo(days) {
  if (days < 0)   return { cls: 'badge-red',   text: 'Expired' };
  if (days === 0) return { cls: 'badge-red',   text: 'Today!' };
  if (days <= 7)  return { cls: 'badge-amber', text: `${days}d left` };
  return { cls: 'badge-green', text: `${days}d left` };
}

function today() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
function fmtDateFull(d) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

function toast(msg, ms = 2400) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function confetti() {
  const colors = ['#6bbb3e','#f5c96a','#f0a0a0','#99b4f8','#fde68a'];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${Math.random()*100}vw;top:${Math.random()*30+20}vh;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*0.6}s;animation-duration:${1.2+Math.random()*0.8}s;transform:rotate(${Math.random()*360}deg);`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

// ── AUTH ──
let authMode = 'login';

function switchTab(mode) {
  authMode = mode;
  document.getElementById('tab-login').className    = 'auth-tab' + (mode === 'login' ? ' active' : '');
  document.getElementById('tab-register').className = 'auth-tab' + (mode === 'register' ? ' active' : '');
  document.getElementById('auth-btn').textContent   = mode === 'login' ? 'Log In' : 'Register';
  document.getElementById('confirm-field').style.display = mode === 'register' ? '' : 'none';
  document.getElementById('forgot-btn').style.display    = mode === 'login' ? '' : 'none';
  document.getElementById('auth-error').className = 'auth-error';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.className = 'auth-error show';
}

async function handleAuth() {
  const email   = document.getElementById('auth-email').value.trim();
  const pass    = document.getElementById('auth-password').value;
  const confirm = document.getElementById('auth-confirm').value;
  const btn     = document.getElementById('auth-btn');
  if (!email || !pass) { showAuthError('Please fill in email and password'); return; }
  if (authMode === 'register' && pass !== confirm) { showAuthError('Passwords do not match'); return; }
  btn.disabled = true;
  btn.textContent = 'Please wait…';
  try {
    if (authMode === 'login') await auth.signInWithEmailAndPassword(email, pass);
    else await auth.createUserWithEmailAndPassword(email, pass);
  } catch(e) {
    showAuthError(ERROR_MAP[e.code] || e.message);
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Log In' : 'Register';
  }
}

async function handleForgot() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { showAuthError('Please fill in email first'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    const s = document.getElementById('auth-success');
    s.textContent = 'Reset email sent! Check your inbox.';
    s.className = 'auth-success show';
  } catch(e) { showAuthError(ERROR_MAP[e.code] || e.message); }
}

async function handleLogout() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  foods = []; shopItems = []; wasteLog = [];
  if (document.getElementById('recipes-list-container'))
    document.getElementById('recipes-list-container').innerHTML = '';
  await auth.signOut();
}

auth.onAuthStateChanged(async (user) => {
  const authScreen = document.getElementById('auth-screen');
  const appScreen  = document.getElementById('app');
  if (user) {
    currentUser = user;
    authScreen.style.display = 'none';
    appScreen.style.display  = 'block';
    document.getElementById('user-email').textContent = user.email;
    startListening(user.uid);
    loadLocalData();
    loadSettings();
    checkAndNotify();
    if (window.puter) {
      try {
        if (!puter.auth.isSignedIn()) await puter.auth.signIn();
      } catch(e) { console.warn('Puter login failed, app still works:', e); }
    }
  } else {
    authScreen.style.display = 'flex';
    appScreen.style.display  = 'none';
    currentUser = null;
    foods = []; shopItems = []; wasteLog = [];
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  }
});

// ── FIRESTORE ──
function startListening(uid) {
  if (unsubscribe) unsubscribe();
  unsubscribe = db.collection('users').doc(uid).collection('foods')
    .orderBy('added','desc')
    .onSnapshot(snap => {
      foods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      render();
    }, err => console.error(err));
}

async function addFood(data) {
  await db.collection('users').doc(currentUser.uid).collection('foods').add({
    ...data, added: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function updateFood(docId, data) {
  await db.collection('users').doc(currentUser.uid).collection('foods').doc(docId).update(data);
}

async function deleteFood(docId) {
  await db.collection('users').doc(currentUser.uid).collection('foods').doc(docId).delete();
}

// ── LOCAL STORAGE ──
function loadLocalData() {
  const uid = currentUser.uid;
  shopItems = JSON.parse(localStorage.getItem(`fk_shop_${uid}`) || '[]');
  wasteLog  = JSON.parse(localStorage.getItem(`fk_waste_${uid}`) || '[]');
  renderShopList();
  renderWasteLog();
}

function saveShopItems() {
  localStorage.setItem(`fk_shop_${currentUser.uid}`, JSON.stringify(shopItems));
}

function saveWasteLog() {
  localStorage.setItem(`fk_waste_${currentUser.uid}`, JSON.stringify(wasteLog));
}

function loadSettings() {
  const uid = currentUser.uid;
  notifDays = parseInt(localStorage.getItem(`fk_notifdays_${uid}`) || '3');
  document.getElementById('notif-days').value = notifDays;
  document.getElementById('notif-days').onchange = e => {
    notifDays = parseInt(e.target.value) || 3;
    localStorage.setItem(`fk_notifdays_${uid}`, notifDays);
    render();
  };
  loadLanguage();
}

// ── VIEWS ──
const ALL_VIEWS = ['pantry','shopping','waste','recipes','receipt','leaderboard','awareness','quiz'];

function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  ALL_VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.style.display = (v === viewName) ? '' : 'none';
  });
  const statsContainer = document.querySelector('.stats');
  if (statsContainer) {
    const hideStats = ['shopping','recipes','receipt','leaderboard','awareness','quiz'];
    statsContainer.style.display = hideStats.includes(viewName) ? 'none' : 'grid';
  }
  if (viewName === 'leaderboard') renderLeaderboard();
  if (viewName === 'awareness')   renderAwareness();
  if (viewName === 'quiz')        renderQuiz();
}

// ── RENDER ──
function render() {
  updateStats();
  const container = document.getElementById('food-container');
  if (!container) return;

  let list = foods.filter(f => {
    const matchesQuery = f.name?.toLowerCase().includes(query.toLowerCase());
    const matchesLoc   = filter === 'all' || f.location === filter;
    return matchesQuery && matchesLoc;
  });

  if (sortBy === 'expiry') list.sort((a,b) => new Date(a.expiry) - new Date(b.expiry));
  else if (sortBy === 'name') list.sort((a,b) => (a.name||'').localeCompare(b.name||''));

  if (list.length === 0) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">🧺</div><p>${query ? 'No matching ingredients found' : 'No ingredients yet — click ➕ Add Item to get started!'}</p></div>`;
    return;
  }

  const groups = [
    { label: '⚠️ Expired',       cls: 'expired-card', items: list.filter(f => daysLeft(f.expiry) < 0) },
    { label: '🔔 Expiring Soon', cls: 'soon-card',    items: list.filter(f => { const d = daysLeft(f.expiry); return d >= 0 && d <= notifDays; }) },
    { label: '✅ Fresh',         cls: '',             items: list.filter(f => daysLeft(f.expiry) > notifDays) },
  ].filter(g => g.items.length > 0);

  container.innerHTML = groups.map(g => `
    <div class="section-label">${g.label} (${g.items.length})</div>
    <div class="food-list">${g.items.map(f => foodCardHTML(f, g.cls)).join('')}</div>
  `).join('');

  container.querySelectorAll('.food-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.action-btn') || e.target.closest('.card-actions')) return;
      if (bulkMode) {
        const id = card.dataset.id;
        if (selectedIds.has(id)) { selectedIds.delete(id); card.classList.remove('selected'); card.querySelector('.food-select').textContent = ''; }
        else { selectedIds.add(id); card.classList.add('selected'); card.querySelector('.food-select').textContent = '✓'; }
        updateBulkBar();
      }
    });
  });
}

function foodCardHTML(f, groupClass) {
  const days = daysLeft(f.expiry);
  const badge = badgeInfo(days);
  const isSelected = selectedIds.has(f.id);
  return `
    <div class="food-card ${groupClass} ${isSelected ? 'selected' : ''}" data-id="${f.id}">
      <div class="food-select">${isSelected ? '✓' : ''}</div>
      <div class="food-emoji">${f.emoji || '🍽️'}</div>
      <div class="food-info">
        <div class="food-name-row">
          <span class="food-name">${f.name}</span>
          ${f.qty ? `<span class="food-qty">${f.qty}</span>` : ''}
        </div>
        <div class="food-meta">
          <span>${LOC_ICON[f.location] || '📍'} ${LOC_LABEL[f.location]}</span>
          <span class="dot">·</span>
          <span>Exp: ${fmtDate(f.expiry)}</span>
        </div>
        ${f.note ? `<div class="food-note">${f.note}</div>` : ''}
      </div>
      <div class="card-badge-wrap">
        <span class="badge ${badge.cls}">${badge.text}</span>
        <div class="card-actions">
          <button class="icon-btn action-btn" onclick="openEditModal('${f.id}')" title="Edit">✏️</button>
          <button class="icon-btn action-btn check" onclick="eatFood('${f.id}')" title="Mark Consumed">✓</button>
          <button class="icon-btn action-btn trash" onclick="wasteFood('${f.id}')" title="Log as Waste">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

function updateStats() {
  document.getElementById('stat-total').textContent   = foods.length;
  document.getElementById('stat-expired').textContent = foods.filter(f => daysLeft(f.expiry) < 0).length;
  document.getElementById('stat-soon').textContent    = foods.filter(f => { const d = daysLeft(f.expiry); return d >= 0 && d <= notifDays; }).length;
  const currentMonthStr = new Date().toISOString().substring(0,7);
  const wastedThisMonth = wasteLog.filter(w => w.date?.startsWith(currentMonthStr)).reduce((sum, w) => sum + (w.price || 0), 0);
  document.getElementById('stat-saved').textContent = 'RM ' + wastedThisMonth.toFixed(2);
}

// ── BULK ──
function toggleBulkMode() {
  bulkMode = !bulkMode;
  selectedIds.clear();
  document.getElementById('bulk-toggle-btn').classList.toggle('active', bulkMode);
  document.getElementById('bulk-bar').style.display = bulkMode ? 'flex' : 'none';
  document.body.classList.toggle('bulk-active', bulkMode);
  render();
}

function updateBulkBar() {
  document.getElementById('bulk-count').textContent = `${selectedIds.size} items selected`;
}

async function bulkEat() {
  if (!selectedIds.size) return;
  const batch = Array.from(selectedIds);
  for (let id of batch) await deleteFood(id);
  confetti();
  toast(`Consumed ${batch.length} items`);
  toggleBulkMode();
}

async function bulkWaste() {
  if (!selectedIds.size) return;
  const batch = Array.from(selectedIds);
  batch.forEach(id => {
    const f = foods.find(x => x.id === id);
    if (f) wasteLog.unshift({ name: f.name, emoji: f.emoji || '🍽️', date: today(), price: f.price || 0 });
  });
  saveWasteLog();
  saveWeeklyWaste();
  renderWasteLog();
  for (let id of batch) await deleteFood(id);
  toast(`Logged ${batch.length} items as wasted`);
  toggleBulkMode();
}

async function bulkDelete() {
  if (!selectedIds.size || !confirm('Permanently delete selected items?')) return;
  const batch = Array.from(selectedIds);
  for (let id of batch) await deleteFood(id);
  toast(`Deleted ${batch.length} items`);
  toggleBulkMode();
}

// ── FOOD ACTIONS ──
async function eatFood(id) {
  await deleteFood(id);
  confetti();
  toast('Ingredient consumed!');
}

async function wasteFood(id) {
  const f = foods.find(x => x.id === id);
  if (f) {
    wasteLog.unshift({ name: f.name, emoji: f.emoji || '🍽️', date: today(), price: f.price || 0 });
    saveWasteLog();
    saveWeeklyWaste();
    renderWasteLog();
  }
  await deleteFood(id);
  toast('Item logged to waste history.');
}

// ── SEARCH / FILTER / SORT ──
function handleSearch(val) { query = val; render(); }
function handleLocationFilter(val) { filter = val; render(); }
function handleSort(val) { sortBy = val; render(); }

// ── WASTE LOG ──
function renderWasteLog() {
  const currentMonthStr = new Date().toISOString().substring(0,7);
  const thisMonth = wasteLog.filter(w => w.date?.startsWith(currentMonthStr));
  document.getElementById('waste-month-count').textContent = thisMonth.length;
  document.getElementById('waste-total-count').textContent = wasteLog.length;
  const container = document.getElementById('waste-list-container');
  if (!container) return;
  if (wasteLog.length === 0) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">🌱</div><p>No waste logged — keep it up!</p></div>';
    return;
  }
  container.innerHTML = wasteLog.map(w => `
    <div class="waste-item">
      <span class="waste-emoji">${w.emoji}</span>
      <span class="waste-name">${w.name}</span>
      ${w.price ? `<span class="waste-price">RM ${(w.price).toFixed(2)}</span>` : ''}
      <span class="waste-item-date">${fmtDateFull(w.date)}</span>
    </div>
  `).join('');
}

// ── SHOPPING ──
function renderShopList() {
  const container = document.getElementById('shop-list-container');
  if (!container) return;
  if (shopItems.length === 0) {
    container.innerHTML = '<div class="empty" style="padding:2rem 1rem;"><div class="empty-icon">🛒</div><p>Shopping list is empty</p></div>';
    return;
  }
  container.innerHTML = shopItems.map((item, i) => `
    <div class="shop-item">
      <div class="shop-check ${item.checked ? 'checked' : ''}" onclick="toggleShopCheck(${i})">${item.checked ? '✓' : ''}</div>
      <span class="shop-name ${item.checked ? 'done' : ''}">${item.name}</span>
      <button class="shop-del" onclick="removeShopItem(${i})">✕</button>
    </div>
  `).join('');
}

function addShopItem() {
  const inp = document.getElementById('shop-input');
  const val = inp.value.trim();
  if (!val) return;
  shopItems.push({ name: val, checked: false });
  saveShopItems(); inp.value = '';
  renderShopList();
}

function toggleShopCheck(i) { shopItems[i].checked = !shopItems[i].checked; saveShopItems(); renderShopList(); }
function removeShopItem(i)  { shopItems.splice(i, 1); saveShopItems(); renderShopList(); }
function clearChecked()     { shopItems = shopItems.filter(x => !x.checked); saveShopItems(); renderShopList(); }

function exportShopList() {
  if (!shopItems.length) return;
  const text = shopItems.map(x => `${x.checked ? '[x]' : '[ ]'} ${x.name}`).join('\n');
  navigator.clipboard.writeText(text);
  toast('Shopping list copied!');
}

// ── MODAL ──
function buildEmojiPicker(selectedEmoji) {
  document.getElementById('emoji-picker').innerHTML = ALL_EMOJIS.map(e => `
    <span class="emoji-opt ${e === selectedEmoji ? 'sel' : ''}" onclick="selectEmoji(this,'${e}')">${e}</span>
  `).join('');
}

function selectEmoji(el, e) {
  document.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('sel'));
  el.classList.add('sel');
}

function getSelectedEmoji() {
  const sel = document.querySelector('.emoji-opt.sel');
  return sel ? sel.textContent : '🍽️';
}

function openModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = '✏️ Add Ingredient';
  document.getElementById('input-name').value  = '';
  document.getElementById('input-qty').value   = '';
  document.getElementById('input-note').value  = '';
  document.getElementById('input-price').value = '';
  document.getElementById('input-location').value = 'fridge';
  document.getElementById('input-category').value = 'other';
  document.getElementById('input-expiry').value   = today();
  document.getElementById('save-btn').textContent = 'Save';
  buildEmojiPicker('🥬');
  document.getElementById('overlay').classList.add('open');
  setTimeout(() => document.getElementById('input-name').focus(), 80);
}

function openEditModal(id) {
  const f = foods.find(x => x.id === id);
  if (!f) return;
  editingId = id;
  document.getElementById('modal-title').textContent = '✏️ Edit Ingredient';
  document.getElementById('input-name').value  = f.name;
  document.getElementById('input-qty').value   = f.qty || '';
  document.getElementById('input-note').value  = f.note || '';
  document.getElementById('input-price').value = f.price || '';
  document.getElementById('input-location').value = f.location || 'fridge';
  document.getElementById('input-category').value = f.category || 'other';
  document.getElementById('input-expiry').value   = f.expiry;
  document.getElementById('save-btn').textContent = 'Update';
  buildEmojiPicker(f.emoji || '🥬');
  document.getElementById('overlay').classList.add('open');
}

function closeModal() { document.getElementById('overlay').classList.remove('open'); }
function openPanel()  { document.getElementById('panel-overlay').classList.add('open'); }
function closePanel() { document.getElementById('panel-overlay').classList.remove('open'); }

async function saveFood() {
  const name   = document.getElementById('input-name').value.trim();
  const expiry = document.getElementById('input-expiry').value;
  if (!name || !expiry) { alert('Name and Expiry are required.'); return; }
  const payload = {
    name, expiry,
    emoji:    getSelectedEmoji(),
    qty:      document.getElementById('input-qty').value.trim(),
    note:     document.getElementById('input-note').value.trim(),
    location: document.getElementById('input-location').value,
    category: document.getElementById('input-category').value,
    price:    parseFloat(document.getElementById('input-price').value) || 0,
  };
  if (editingId) { await updateFood(editingId, payload); toast('Updated!'); }
  else           { await addFood(payload); toast('Added!'); }
  closeModal();
}

function exportCSV() {
  const header = ['Name','Category','Location','Expiry','Quantity','Notes','Price (RM)','Days Left'];
  const rows = foods.map(f => [
    `"${f.name||''}"`, `"${CAT_LABEL[f.category||'other']}"`, `"${LOC_LABEL[f.location]}"`,
    f.expiry, `"${f.qty||''}"`, `"${f.note||''}"`, (f.price||0).toFixed(2), daysLeft(f.expiry)
  ]);
  const csv = [header,...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'food-keeper-export.csv';
  a.click();
  toast('CSV exported!');
}

// ── NOTIFICATIONS ──
const NOTIF_KEY = 'foodkeeper_notif_date';

function sendNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const expired = foods.filter(f => daysLeft(f.expiry) < 0);
  const today_  = foods.filter(f => daysLeft(f.expiry) === 0);
  const soon_   = foods.filter(f => { const d = daysLeft(f.expiry); return d > 0 && d <= notifDays; });
  if (!expired.length && !today_.length && !soon_.length) return;
  if (localStorage.getItem(NOTIF_KEY) === today()) return;
  let body = '';
  if (expired.length) body += `⚠️ ${expired.length} items expired! `;
  if (today_.length)  body += `🔔 ${today_.length} expiring today! `;
  if (soon_.length)   body += `⏳ ${soon_.length} expiring soon.`;
  new Notification('Food Keeper Alert', { body });
  localStorage.setItem(NOTIF_KEY, today());
}

function checkAndNotify() {
  if (!('Notification' in window)) return;
  const t = document.getElementById('notif-toggle');
  if (!t) return;
  if (Notification.permission === 'granted') {
    t.className = 'toggle on';
    setTimeout(sendNotifications, 1500);
  } else { t.className = 'toggle off'; }
}

async function toggleNotif() {
  if (!('Notification' in window)) { alert('Notifications not supported.'); return; }
  const t = document.getElementById('notif-toggle');
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') { t.className = 'toggle on'; sendNotifications(); }
  } else if (Notification.permission === 'granted') {
    toast('To disable, change permissions in your browser settings.');
  } else { alert('Notifications blocked. Enable in browser settings.'); }
}

// ── AI RECIPES ──
async function generateAICustomMenu() {
  const outputDiv = document.getElementById('recipes-list-container');
  if (outputDiv) outputDiv.innerHTML = '<div class="loading">Food Keeper AI analyzing your ingredients... Please wait...</div>';
  try {
    if (!foods.length) { if (outputDiv) outputDiv.innerHTML = '<div class="empty">🧺 Add ingredients first.</div>'; return; }
    const calcDL = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : 999;
    const expiring = foods.filter(f => calcDL(f.expiry) <= 7);
    const toUse = expiring.length > 0 ? expiring : foods;
    const list = toUse.map(i => `- ${i.name} (Qty: ${i.qty || 'N/A'}, Location: ${i.location})`).join('\n');
    const prompt = `You are a professional home cook and Michelin chef.
Generate a creative zero-waste menu plan using:
${list}
Requirements:
- Propose 2 balanced recipes maximizing ingredient utilization.
- Output ONLY clean HTML. No inline CSS or style attributes.
- Use <h3> for each recipe name with a food emoji.
- Use <ul> for ingredients and <ol> for step-by-step directions.`;
    const response = await puter.ai.chat(prompt);
    if (outputDiv) {
      outputDiv.innerHTML = `
        <div class="recipe-card" style="background:var(--surface);padding:24px;border-radius:12px;border:1px solid var(--border2);margin-top:15px;">
          <span style="background:var(--accent);color:white;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block;margin-bottom:15px;">Food Keeper AI Custom Menu</span>
          <div class="ai-generated-html">${response.toString()}</div>
        </div>`;
    }
  } catch(e) {
    console.error(e);
    if (outputDiv) outputDiv.innerHTML = `<div style="background:var(--red-bg);color:var(--red-text);padding:12px;border-radius:8px;">⚠️ AI generation failed. Please try again.</div>`;
  }
}

// ── RECEIPT SCANNER ──
let currentReceiptBase64 = null;
let scannedReceiptItems  = [];

function previewReceipt(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    currentReceiptBase64 = e.target.result;
    document.getElementById('receipt-img-preview').src = currentReceiptBase64;
    document.getElementById('receipt-preview-box').style.display = 'block';
    const out = document.getElementById('receipt-results-container');
    if (out) out.innerHTML = '';
    const addBtn = document.getElementById('add-to-inventory-btn');
    if (addBtn) addBtn.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return new Blob([ab], { type: mimeString });
}

async function processReceiptImage() {
  const outputDiv = document.getElementById('receipt-results-container');
  const scanBtn   = document.getElementById('scan-receipt-btn');
  const addBtn    = document.getElementById('add-to-inventory-btn');
  if (!currentReceiptBase64) { alert('Please upload a receipt image first.'); return; }
  if (scanBtn) { scanBtn.disabled = true; scanBtn.textContent = 'Analyzing...'; }
  if (addBtn) addBtn.style.display = 'none';
  if (outputDiv) outputDiv.innerHTML = '<div class="loading">🧠 AI is reading your receipt...</div>';
  try {
    const blob = dataURItoBlob(currentReceiptBase64);
    const file = new File([blob], 'receipt', { type: blob.type });
    const prompt = `You are a receipt parser. Find all food items, filter out non-food items like taxes and services. Estimate expiry days for each item. Output ONLY a valid JSON array:
[{"name":"Item","price":1.99,"category":"dairy","estimated_expiry_days":7,"location":"fridge","emoji":"🥛"}]
Categories: dairy, produce, meat, grain, other. Locations: fridge, freezer, pantry.`;
    const response = await puter.ai.chat(prompt, file);
    let raw = response.toString().trim();
    let match = raw.match(/\[\s*\{.*\}\s*\]/s);
    scannedReceiptItems = JSON.parse(match ? match[0] : raw);
    let tableHTML = `<table><tr><th>Food Item</th><th>Price</th><th>Est. Expiry</th><th>Storage</th></tr>`;
    let total = 0;
    scannedReceiptItems.forEach(item => {
      tableHTML += `<tr><td>${item.emoji||'📦'} ${item.name}</td><td>RM ${item.price.toFixed(2)}</td><td>${item.estimated_expiry_days||7} days</td><td>${LOC_LABEL[item.location]||'Fridge'}</td></tr>`;
      total += item.price;
    });
    tableHTML += `<tr><td><strong>Total</strong></td><td><strong>RM ${total.toFixed(2)}</strong></td><td></td><td></td></tr></table>`;
    if (outputDiv) {
      outputDiv.innerHTML = `<div class="recipe-card" style="background:var(--surface);padding:24px;border-radius:12px;border:1px solid var(--border2);">
        <span style="background:var(--text);color:var(--bg);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block;margin-bottom:15px;">Receipt Data</span>
        <div class="receipt-data-table-wrapper">${tableHTML}</div></div>`;
    }
    if (addBtn) addBtn.style.display = 'block';
    confetti(); toast('Receipt scanned successfully!');
  } catch(e) {
    console.error(e);
    if (outputDiv) outputDiv.innerHTML = `<div style="background:var(--red-bg);color:var(--red-text);padding:12px;border-radius:8px;">⚠️ Scan failed. Ensure image is clear and try again.</div>`;
  } finally {
    if (scanBtn) { scanBtn.disabled = false; scanBtn.textContent = 'Analyze & Compute Total'; }
  }
}

async function addScannedItemsToInventory() {
  const addBtn = document.getElementById('add-to-inventory-btn');
  if (!scannedReceiptItems.length) return;
  if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Adding to inventory...'; }
  try {
    for (let item of scannedReceiptItems) {
      const exp = new Date();
      exp.setDate(exp.getDate() + (item.estimated_expiry_days || 7));
      await addFood({
        name: item.name, expiry: exp.toISOString().split('T')[0],
        emoji: item.emoji || '🍽️', qty: '1', note: 'Auto-added from receipt scan',
        location: item.location || 'pantry', category: item.category || 'other',
        price: parseFloat(item.price) || 0,
      });
    }
    toast(`Added ${scannedReceiptItems.length} items to your pantry!`);
    scannedReceiptItems = [];
    document.getElementById('receipt-results-container').innerHTML = '';
    document.getElementById('receipt-file').value = '';
    document.getElementById('receipt-preview-box').style.display = 'none';
    currentReceiptBase64 = null;
    if (addBtn) addBtn.style.display = 'none';
    switchView('pantry');
  } catch(e) {
    console.error(e);
    toast('Error saving items. Please try again.');
  } finally {
    if (addBtn) { addBtn.disabled = false; addBtn.textContent = 'Add All Items to Inventory ➕'; }
  }
}
ENDOFFILE
echo "app.js written"
