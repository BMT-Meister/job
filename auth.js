// ================================================================
//  auth.js
//  인증 공통 모듈 — admin.html / student.html 공통
//  의존: db, auth, TEACHER_ROLE_LIST [constants.js],
//        updateTopbarAvatar [profile.js], showToast [ui-utils.js]
//
//  각 HTML에서 아래 함수를 구현해야 합니다:
//    - window._onAuthReady(userData)  : 인증 성공 후 초기화 훅
//    - window._allowedRoles           : 접근 허용 역할 배열
//      (admin.html → TEACHER_ROLE_LIST, student.html → ['student'])
// ================================================================

/* ── 로그아웃 ── */
function doLogout() {
  auth.signOut().then(() => { window.location.href = 'index.html'; });
}

/* ── 권한 체크 헬퍼 ── */
function isTeacherRole(role)  { return TEACHER_ROLE_LIST.includes(role); }
function isMasterRole(role)   { return role === 'master'; }
function canManage(role)      { return ['master', 'employment_teacher'].includes(role); }

/* ── 인증 상태 감지 ── */
auth.onAuthStateChanged(async user => {
  if (!user) { window.location.href = 'index.html'; return; }

  const snap = await db.ref('users/' + user.uid).once('value');
  const ud   = snap.val();

  if (!ud) { window.location.href = 'index.html'; return; }

  // 허용 역할 체크 (각 페이지가 window._allowedRoles 배열로 정의)
  const allowed = window._allowedRoles || [];
  if (allowed.length && !allowed.includes(ud.role)) {
    window.location.href = 'index.html'; return;
  }

  // 승인 대기 → 항상 차단
  if (ud.role === 'pending') { window.location.href = 'index.html'; return; }

  // 전역 currentUser 세팅
  _currentUser = { ...ud, uid: user.uid };

  // Topbar 아바타 업데이트
  if (typeof updateTopbarAvatar === 'function') {
    updateTopbarAvatar(ud.photoURL, ud.name);
  }

  // 페이지별 초기화 훅 호출
  if (typeof window._onAuthReady === 'function') {
    window._onAuthReady(_currentUser);
  }
});

/* ── 동기 상태 표시 ── */
function setSyncOk() {
  const dot   = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  if (dot)   dot.className   = 'sync-dot ok';
  if (label) label.textContent = '실시간';
}

function setSyncError() {
  const dot   = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  if (dot)   dot.className   = 'sync-dot';
  if (label) label.textContent = '끊김';
}

function setSyncing() {
  const dot   = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  if (dot)   dot.className   = 'sync-dot syncing';
  if (label) label.textContent = '저장 중';
}
