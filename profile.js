// ================================================================
//  profile.js
//  프로필 기능 — admin.html / student.html 공통
//  의존: auth, db, _currentUser, showToast(), closeModal(),
//        FILE_LIMITS [constants.js]
// ================================================================

let _pendingPhoto = null;

/* ── 프로필 모달 열기 ── */
function openProfileModal() {
  const u = _currentUser || {};
  _pendingPhoto = null;
  const nameEl = document.getElementById('pm-name');
  const pw1    = document.getElementById('pm-pw1');
  const pw2    = document.getElementById('pm-pw2');
  const msg    = document.getElementById('pm-msg');
  if (nameEl) nameEl.textContent    = u.name || u.email || '';
  if (pw1)    pw1.value             = '';
  if (pw2)    pw2.value             = '';
  if (msg)    msg.textContent       = '';
  renderProfileAvatar('pm-avatar-wrap', u.photoURL, u.name, true);
  document.getElementById('profile-modal').classList.add('open');
}

/* ── 아바타 렌더링 (공통) ── */
function renderProfileAvatar(containerId, photoURL, name, clickable = false) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const initial  = (name || '?').charAt(0).toUpperCase();
  const clickAttr = clickable
    ? `style="cursor:pointer;" onclick="document.getElementById('pm-photo-input').click()"`
    : '';
  if (photoURL) {
    wrap.innerHTML = `<img src="${photoURL}" alt="" ${clickAttr}
      style="width:80px;height:80px;border-radius:50%;object-fit:cover;
             border:2px solid var(--border2);${clickable ? 'cursor:pointer;' : ''}">`;
  } else {
    wrap.innerHTML = `<div class="profile-avatar-fallback" ${clickAttr}>${initial}</div>`;
  }
}

/* ── Topbar 아바타 업데이트 ── */
function updateTopbarAvatar(photoURL, name) {
  // admin: #profile-img-admin / #profile-initial-admin
  // student: #profile-img-st / #profile-initial-st
  ['admin', 'st'].forEach(suffix => {
    const img = document.getElementById(`profile-img-${suffix}`);
    const ini = document.getElementById(`profile-initial-${suffix}`);
    if (!img && !ini) return;
    if (photoURL) {
      if (img) { img.src = photoURL; img.style.display = 'block'; }
      if (ini) ini.style.display = 'none';
    } else {
      if (img) img.style.display = 'none';
      if (ini) ini.textContent = (name || '?').charAt(0).toUpperCase();
    }
  });
}

/* ── 프로필 사진 선택 핸들러 ── */
async function handleProfilePhoto(e) {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > FILE_LIMITS.PROFILE_PHOTO) {
    showToast('사진은 2MB 이하만 가능합니다', 'warning');
    e.target.value = ''; return;
  }
  const reader    = new FileReader();
  reader.onload   = ev => {
    _pendingPhoto = ev.target.result;
    renderProfileAvatar('pm-avatar-wrap', _pendingPhoto, _currentUser?.name, true);
    const msg = document.getElementById('pm-msg');
    if (msg) { msg.style.color = 'var(--text2)'; msg.textContent = '사진을 선택했습니다. 저장 버튼을 눌러 적용하세요.'; }
  };
  reader.onerror  = () => showToast('파일 읽기 실패', 'warning');
  reader.readAsDataURL(file);
}

/* ── 프로필 저장 (사진 + 비밀번호) ── */
async function saveProfile() {
  const pw1  = document.getElementById('pm-pw1')?.value  || '';
  const pw2  = document.getElementById('pm-pw2')?.value  || '';
  const msg  = document.getElementById('pm-msg');
  const uid_ = auth.currentUser?.uid;

  const setMsg = (text, color) => { if (msg) { msg.style.color = color; msg.textContent = text; } };

  // 비밀번호 유효성
  if (pw1 || pw2) {
    if (pw1.length < 6) { setMsg('비밀번호는 6자 이상이어야 합니다.', '#f87171'); return; }
    if (pw1 !== pw2)    { setMsg('비밀번호가 일치하지 않습니다.', '#f87171');    return; }
  }

  try {
    // 사진 저장
    if (_pendingPhoto && uid_) {
      await db.ref('users/' + uid_ + '/photoURL').set(_pendingPhoto);
      if (_currentUser) _currentUser.photoURL = _pendingPhoto;
      updateTopbarAvatar(_pendingPhoto, _currentUser?.name);
      _pendingPhoto = null;
    }
    // 비밀번호 변경
    if (pw1) await auth.currentUser.updatePassword(pw1);

    setMsg('저장되었습니다.', '#4ade80');
    setTimeout(() => closeModal('profile-modal'), 1200);
  } catch (e) {
    const errMsg = e.code === 'auth/requires-recent-login'
      ? '보안을 위해 재로그인 후 다시 시도해주세요.'
      : e.message;
    setMsg(errMsg, '#f87171');
  }
}
