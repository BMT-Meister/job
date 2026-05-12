// ================================================================
//  app.js  (admin 전용)
//  역할: Firebase 초기화 + 페이지 초기화 + 각 모듈 연결
//  로드 순서: constants → helpers → ui-utils → ... → app.js → auth.js
// ================================================================

// ── Firebase 초기화 (admin 전용 — student.html은 인라인에서 처리) ──
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.database();

// ── 허용 역할 선언 (auth.js가 참조) ──
window._allowedRoles = ['master', 'employment_teacher', 'general_teacher'];

// ── 전역 상태 ──
let _currentUser = null;
let STATE = { companies: {}, students: {}, schedules: {}, users: {}, posts: {} };
let _currentPostId = null;
let _importRows    = [];

// ── 인증 완료 훅 ──
window._onAuthReady = function(user) {
  const nameEl  = document.getElementById('user-name-admin');
  const schoolEl= document.getElementById('school-sub');
  if (nameEl)   nameEl.textContent   = user.name || user.email || '';
  if (schoolEl) schoolEl.textContent = (typeof SCHOOL_NAME !== 'undefined' ? SCHOOL_NAME : '') + ' · 관리자';
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  _initListeners();
};

// ── Firebase Realtime DB 리스너 ──
function _initListeners() {
  db.ref('/').on('value', snap => {
    const d          = snap.val() || {};
    STATE.companies  = d.companies  || {};
    STATE.students   = d.students   || {};
    STATE.schedules  = d.schedules  || {};
    STATE.users      = d.users      || {};
    STATE.posts      = d.posts      || {};
    const loading    = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    setSyncOk();
    _refreshAll();
  }, () => setSyncError());

  db.ref('.info/connected').on('value', s => s.val() ? setSyncOk() : setSyncError());
}

// ── 전체 렌더링 ──
function _refreshAll() {
  const page = document.querySelector('.page.active')?.id?.replace('page-', '') || 'dashboard';
  if (typeof renderDashboard  === 'function') renderDashboard();
  if (typeof renderCompanies  === 'function' && page === 'companies') renderCompanies();
  if (typeof renderStudents   === 'function' && page === 'students')  { renderStudents(); updateFilters(); }
  if (typeof renderSchedule   === 'function' && page === 'schedule')  renderSchedule();
  if (typeof renderBoard      === 'function' && page === 'board')     renderBoard();
  if (typeof renderUsers      === 'function' && page === 'users')     renderUsers();
  if (typeof updateFilters    === 'function') updateFilters();
}

// refreshAll을 외부에서도 호출 가능하게 alias
function refreshAll() { _refreshAll(); }

// ── 페이지 전환 ──
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const pageEl = document.getElementById('page-' + name);
  const tabEl  = document.getElementById('tab-' + name);
  if (pageEl) pageEl.classList.add('active');
  if (tabEl)  tabEl.classList.add('active');

  // 페이지별 렌더 트리거
  const renderMap = {
    dashboard:  () => typeof renderDashboard === 'function'  && renderDashboard(),
    companies:  () => typeof renderCompanies === 'function'  && renderCompanies(),
    students:   () => { if (typeof renderStudents === 'function') { renderStudents(); updateFilters(); } },
    schedule:   () => typeof renderSchedule  === 'function'  && renderSchedule(),
    board:      () => typeof renderBoard     === 'function'  && renderBoard(),
    users:      () => typeof renderUsers     === 'function'  && renderUsers()
  };
  if (renderMap[name]) renderMap[name]();
}
