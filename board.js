// ================================================================
//  board.js
//  게시판 공통 모듈 — admin.html / student.html 양쪽 사용
//
//  admin 전용 함수:  renderBoard_admin, openPostDetail_admin,
//                    closePostDetail_admin, submitAdminReply,
//                    toggleAnswered, deleteComment, deletePost
//
//  student 전용:     renderBoard_student, openPostDetail_student,
//                    closePostDetail_student, openWriteModal,
//                    submitPost, submitComment,
//                    deleteMyPost, deleteMyComment
//
//  공통 헬퍼:        _isTeacher(), _authorHtml(), renderComments()
//
//  의존: STATE, db, uid()/_currentUser, showToast(), closeModal(),
//        promptPassword() [modal-utils.js],
//        previewPostImage(), removePostImage() [uploads.js]
// ================================================================

// ── 공통 헬퍼 ──
const TEACHER_ROLES = ['master', 'employment_teacher', 'general_teacher'];

function _isTeacher(role) { return TEACHER_ROLES.includes(role); }

function _authorHtml(post, teacherColor = 'var(--accent2)') {
  const name      = post.authorName || (post.authorEmail || '').split('@')[0];
  const isTeacher = _isTeacher(post.authorRole);
  return isTeacher
    ? `<span style="color:${teacherColor};">👨‍🏫 ${name}</span>`
    : name;
}

// ── 댓글 공통 렌더링 ──
function renderComments(postOrId, containerSelector = '#pd-comments', cntSelector = '#pd-reply-cnt', currentUid = null, onDeleteFn = null) {
  const p        = typeof postOrId === 'string' ? (STATE.posts[postOrId] || {}) : postOrId;
  const comments = Object.values(p.comments || {}).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const container = document.querySelector(containerSelector);
  const cntEl     = document.querySelector(cntSelector);
  if (cntEl)     cntEl.textContent = comments.length;
  if (!container) return;

  if (!comments.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:8px 0;">첫 댓글을 남겨보세요.</div>';
    return;
  }

  container.innerHTML = comments.map(c => {
    const author  = c.authorName || (c.authorEmail || '').split('@')[0];
    const isAdmin = _isTeacher(c.role);
    const isMe    = currentUid && c.authorUid === currentUid;
    const canDel  = isMe || onDeleteFn?.canDeleteAll;
    const delBtn  = canDel
      ? `<button class="btn btn-sm" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;"
           onclick="${onDeleteFn?.fn}('${p.id || postOrId}','${c.id}')">삭제</button>`
      : '';
    return `<div class="comment-item ${isAdmin ? 'comment-admin' : ''}">
      <div class="comment-author">${isAdmin ? '👨‍🏫 ' : ''}${author}${isAdmin ? ' (교사)' : ''}</div>
      <div class="comment-body">${c.content || ''}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px;">
        <span style="font-size:11px;color:var(--text3);">${(c.createdAt || '').slice(0, 16).replace('T', ' ')}</span>
        ${delBtn}
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════
//  ADMIN 전용
// ════════════════════════════════════════════════════════

function renderBoard_admin() {
  const filter = document.getElementById('board-filter')?.value || '';
  let posts    = Object.values(STATE.posts || {}).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  if (filter === 'unanswered') posts = posts.filter(p => !p.answered);
  if (filter === 'answered')   posts = posts.filter(p =>  p.answered);

  const cnt = document.getElementById('board-cnt');
  if (cnt) cnt.textContent = posts.length + '건';

  const list = document.getElementById('board-list');
  if (!list) return;
  if (!posts.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-text">게시글 없음</div></div>';
    return;
  }

  list.innerHTML = '<div class="post-list">' + posts.map((p, i) => {
    const replyCount  = Object.keys(p.comments || {}).length;
    const secretLabel = p.isSecret ? '<span class="secret-badge">🔒 비밀글</span> ' : '';
    const authorHtml  = _authorHtml(p);
    return `<div class="post-row" onclick="openPostDetail_admin('${p.id}')">
      <div class="post-num">${posts.length - i}</div>
      <div class="post-title">${secretLabel}${p.title || '(제목없음)'}${replyCount ? `<span class="reply-cnt">[${replyCount}]</span>` : ''}</div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${p.answered ? '<span class="badge badge-green">답변완료</span>' : '<span class="badge badge-yellow">미답변</span>'}
        <div class="post-meta">${authorHtml} · ${(p.createdAt || '').slice(0, 10)}</div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

async function openPostDetail_admin(id) {
  const p = STATE.posts[id]; if (!p) return;

  // 비밀글: 관리자는 비밀번호 없이 열람
  if (p.isSecret) {
    const canBypass = _isTeacher(_currentUser?.role);
    if (!canBypass) {
      const pw = await promptPassword('🔒 비밀글입니다. 비밀번호를 입력하세요:');
      if (pw === null) return;
      const ok = await checkSecretPw(pw, p.secretPw);
      if (!ok) { showToast('비밀번호가 올바르지 않습니다.', 'warning'); return; }
    }
  }

  _currentPostId = id;
  const card   = document.getElementById('board-card');
  const detail = document.getElementById('post-detail-wrap');
  if (card)   card.style.display   = 'none';
  if (detail) detail.style.display = 'block';

  const author  = p.authorName || (p.authorEmail || '').split('@')[0];
  const isTeach = _isTeacher(p.authorRole);

  _setInnerText('pd-title', p.title || '(제목없음)');
  _setInnerHTML('pd-status-badge',
    (p.isSecret ? '<span class="secret-badge">🔒 비밀글</span> ' : '') +
    (p.answered  ? '<span class="badge badge-green">답변완료</span>' : '<span class="badge badge-yellow">미답변</span>')
  );
  _setInnerHTML('pd-meta',
    `${isTeach ? '👨‍🏫 ' : ''}<strong>${author}</strong>${isTeach ? ' (교사)' : ''} · ${(p.createdAt || '').slice(0, 16).replace('T', ' ')}`
  );
  _setInnerText('pd-body', p.content || '');

  // 이미지
  const bodyEl = document.getElementById('pd-body');
  if (bodyEl) {
    const old = bodyEl.parentNode?.querySelector('.post-img');
    if (old) old.remove();
    if (p.imageData) {
      const img    = document.createElement('img');
      img.src      = p.imageData; img.className = 'post-img'; img.style.maxHeight = '280px';
      img.style.cursor = 'pointer';
      img.onclick  = () => viewImage(p.imageData);
      bodyEl.parentNode.insertBefore(img, bodyEl.nextSibling);
    }
  }

  // 댓글 렌더링
  renderComments(p, '#pd-comments', '#pd-reply-cnt', _currentUser?.uid, { fn: 'deleteComment', canDeleteAll: true });

  // 답변완료 버튼
  const btnAns = document.getElementById('btn-mark-answered');
  if (btnAns) {
    btnAns.textContent = p.answered ? '✓ 답변완료 취소' : '✓ 답변완료 처리';
    btnAns.className   = p.answered ? 'btn btn-secondary' : 'btn btn-success';
  }

  // 삭제 버튼 (master/employment_teacher만)
  const canDelete = ['master', 'employment_teacher'].includes(_currentUser?.role);
  const delWrap   = document.getElementById('pd-admin-delete');
  if (delWrap) delWrap.innerHTML = canDelete
    ? `<button class="btn btn-danger btn-sm" onclick="deletePost('${id}')">🗑 게시글 삭제</button>` : '';
}

function closePostDetail_admin() {
  const card   = document.getElementById('board-card');
  const detail = document.getElementById('post-detail-wrap');
  const reply  = document.getElementById('admin-reply');
  if (card)   card.style.display   = '';
  if (detail) detail.style.display = 'none';
  if (reply)  reply.value          = '';
  _currentPostId = null;
}

async function submitAdminReply() {
  if (!_currentPostId) return;
  const content = document.getElementById('admin-reply')?.value.trim();
  if (!content) { showToast('답변 내용 입력 필요', 'warning'); return; }

  const id = uid();
  await db.ref('/posts/' + _currentPostId + '/comments/' + id).set({
    id, content,
    authorName:  _currentUser.name  || '교사',
    authorEmail: _currentUser.email || '',
    authorUid:   _currentUser.uid   || '',
    role:        _currentUser.role  || 'general_teacher',
    createdAt:   new Date().toISOString()
  });
  await db.ref('/posts/' + _currentPostId).update({ answered: true, answeredAt: new Date().toISOString() });

  const el = document.getElementById('admin-reply');
  if (el) el.value = '';
  showToast('답변 등록', 'success');
}

async function toggleAnswered() {
  if (!_currentPostId) return;
  const p = STATE.posts[_currentPostId];
  await db.ref('/posts/' + _currentPostId).update({ answered: !p.answered });
  showToast((!p.answered ? '답변완료' : '미답변') + '으로 변경', 'info');
}

async function deleteComment(postId, commentId) {
  await db.ref('/posts/' + postId + '/comments/' + commentId).remove();
  openPostDetail_admin(postId);
  showToast('댓글 삭제', 'info');
}

async function deletePost(id) {
  if (!confirm('게시글을 삭제할까요?')) return;
  await db.ref('/posts/' + id).remove();
  closePostDetail_admin();
  showToast('게시글 삭제', 'info');
}

// ════════════════════════════════════════════════════════
//  STUDENT 전용
// ════════════════════════════════════════════════════════

function renderBoard_student() {
  const posts = Object.values(STATE.posts || {}).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const cnt   = document.getElementById('board-cnt');
  if (cnt) cnt.textContent = posts.length + '건';

  const list = document.getElementById('board-list');
  if (!list) return;
  if (!posts.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-text">아직 게시글이 없습니다</div><div class="empty-sub">첫 질문을 남겨보세요!</div></div>';
    return;
  }

  list.innerHTML = '<div class="post-list">' + posts.map((p, i) => {
    const replyCount  = Object.keys(p.comments || {}).length;
    const secretLabel = p.isSecret ? '<span class="secret-badge">🔒 비밀글</span> ' : '';
    const authorHtml  = _authorHtml(p, '#059669');
    return `<div class="post-row" onclick="openPostDetail_student('${p.id}')">
      <div class="post-num">${posts.length - i}</div>
      <div class="post-title-cell">${secretLabel}${p.title || '(제목없음)'}${replyCount ? `<span class="rc">[${replyCount}]</span>` : ''}</div>
      <div style="display:flex;align-items:center;gap:7px;">
        ${p.answered ? '<span class="badge badge-green" style="font-size:10px;">답변완료</span>' : '<span class="badge badge-yellow" style="font-size:10px;">미답변</span>'}
        <div class="post-meta-cell">${authorHtml} · ${(p.createdAt || '').slice(0, 10)}</div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

async function openPostDetail_student(id) {
  const p = STATE.posts[id]; if (!p) return;

  // 비밀글 접근 제어 (해시 비교)
  if (p.isSecret && p.authorUid !== _currentUser?.uid) {
    const pw = await promptPassword('🔒 비밀글입니다. 비밀번호를 입력하세요:');
    if (pw === null) return;
    const ok = await checkSecretPw(pw, p.secretPw);
    if (!ok) { showToast('비밀번호가 올바르지 않습니다.', 'warning'); return; }
  }

  _currentPostId = id;
  const listWrap = document.getElementById('board-list-wrap');
  const detail   = document.getElementById('post-detail-wrap');
  if (listWrap) listWrap.style.display = 'none';
  if (detail)   detail.style.display   = 'block';

  const author  = p.authorName || (p.authorEmail || '').split('@')[0];
  const isTeach = _isTeacher(p.authorRole);

  _setInnerText('pd-title', p.title || '');
  _setInnerHTML('pd-status-badge',
    (p.isSecret ? '<span class="secret-badge">🔒 비밀글</span> ' : '') +
    (p.answered  ? '<span class="badge badge-green">답변완료</span>' : '<span class="badge badge-yellow">미답변</span>')
  );
  _setInnerHTML('pd-meta',
    `${isTeach ? '👨‍🏫 ' : ''}<strong>${author}</strong>${isTeach ? ' (교사)' : ''} · ${(p.createdAt || '').slice(0, 16).replace('T', ' ')}`
  );
  _setInnerText('pd-body', p.content || '');

  // 이미지
  const bodyEl = document.getElementById('pd-body');
  if (bodyEl) {
    const old = bodyEl.parentNode?.querySelector('.post-img');
    if (old) old.remove();
    if (p.imageData) {
      const img   = document.createElement('img');
      img.src     = p.imageData; img.className = 'post-img'; img.style.maxHeight = '280px';
      img.style.cursor = 'pointer';
      img.onclick = () => viewImage(p.imageData);
      bodyEl.parentNode.insertBefore(img, bodyEl.nextSibling);
    }
  }

  // 댓글
  renderComments(p, '#pd-comments', '#pd-reply-cnt', _currentUser?.uid,
    { fn: 'deleteMyComment', canDeleteAll: false });

  // 내 글 삭제 버튼
  const delWrap = document.getElementById('pd-delete-wrap');
  if (delWrap) {
    delWrap.innerHTML = p.authorUid === _currentUser?.uid
      ? `<button class="btn btn-sm" style="background:var(--red-bg);color:#f87171;border:1px solid rgba(248,113,113,.2);"
           onclick="deleteMyPost('${id}')">내 글 삭제</button>` : '';
  }
}

function closePostDetail_student() {
  const listWrap = document.getElementById('board-list-wrap');
  const detail   = document.getElementById('post-detail-wrap');
  const comment  = document.getElementById('my-comment');
  if (listWrap) listWrap.style.display = '';
  if (detail)   detail.style.display   = 'none';
  if (comment)  comment.value          = '';
  _currentPostId = null;
  if (typeof renderBoard_student === 'function') renderBoard_student();
}

/* ── 글쓰기 모달 ── */
function openWriteModal(editId) {
  const modal = document.getElementById('write-modal'); if (!modal) return;
  document.getElementById('edit-post-id').value = editId || '';
  _setInnerHTML('post-img-preview', '');
  const imgInput = document.getElementById('post-img-input');
  if (imgInput) imgInput.value = '';

  const secretCb  = document.getElementById('post-secret');
  const secretWrap = document.getElementById('secret-pw-wrap');
  const secretPwEl = document.getElementById('post-secret-pw');

  if (editId) {
    const p = STATE.posts[editId] || {};
    _setVal('post-title', p.title || '');
    _setVal('post-content', p.content || '');
    if (p.imageData) {
      _setInnerHTML('post-img-preview', `
        <div style="position:relative;display:inline-block;margin-top:8px;">
          <img src="${p.imageData}" class="post-img" style="max-height:160px;border-radius:6px;cursor:pointer;"
               onclick="viewImage('${p.imageData}')">
          <button onclick="removePostImage()"
            style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.65);border:none;
                   color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:13px;">✕</button>
        </div>`);
    }
    if (p.isSecret) {
      if (secretCb)   secretCb.checked = true;
      if (secretWrap) secretWrap.style.display = 'block';
      if (secretPwEl) secretPwEl.value = p.secretPw || '';
    } else {
      if (secretCb)   secretCb.checked = false;
      if (secretWrap) secretWrap.style.display = 'none';
      if (secretPwEl) secretPwEl.value = '';
    }
  } else {
    _setVal('post-title', ''); _setVal('post-content', '');
    if (secretCb)   secretCb.checked = false;
    if (secretWrap) secretWrap.style.display = 'none';
    if (secretPwEl) secretPwEl.value = '';
  }
  modal.classList.add('open');
}

/* ── SHA-256 해시 (비밀글 비밀번호 보안 처리) ── */
async function hashPw(pw) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function checkSecretPw(input, storedHash) {
  // 구버전 호환: 평문 저장된 경우도 처리
  if (input === storedHash) return true;
  const h = await hashPw(input);
  return h === storedHash;
}

/* ── 게시글 제출 (해시 적용) ── */
async function submitPost() {
  const title   = document.getElementById('post-title')?.value.trim();
  const content = document.getElementById('post-content')?.value.trim();
  if (!title || !content) { showToast('제목과 내용을 입력해 주세요.', 'warning'); return; }
  if (!_currentUser) return;

  const editId   = document.getElementById('edit-post-id')?.value || '';
  const id       = editId || db.ref().push().key;
  const isSecret = document.getElementById('post-secret')?.checked || false;
  const rawPw    = isSecret ? (document.getElementById('post-secret-pw')?.value || '') : '';

  if (isSecret && !rawPw) { showToast('비밀글은 비밀번호를 설정해야 합니다.', 'warning'); return; }

  // 비밀번호 SHA-256 해시 (평문 저장 금지)
  const secretPw = isSecret ? await hashPw(rawPw) : '';

  const imgEl     = document.getElementById('post-img-preview')?.querySelector('img');
  const imageData = imgEl ? imgEl.src : '';

  try {
    await db.ref('/posts/' + id).set({
      id, title, content,
      authorName:  _currentUser.name  || '',
      authorEmail: _currentUser.email || '',
      authorUid:   _currentUser.uid   || '',
      authorRole:  _currentUser.role  || 'student',
      isSecret, secretPw,
      imageData: imageData || '',
      answered:  editId ? (STATE.posts[editId]?.answered  || false) : false,
      comments:  editId ? (STATE.posts[editId]?.comments  || {})    : {},
      createdAt: editId ? (STATE.posts[editId]?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    closeModal('write-modal');
    showToast(editId ? '글 수정 완료' : '글 등록 완료', 'success');
  } catch(e) { showToast('저장 실패: '+e.message, 'warning'); }
}

/* ── 댓글 제출 (student) ── */
async function submitComment() {
  if (!_currentPostId || !_currentUser) return;
  const content = document.getElementById('my-comment')?.value.trim();
  if (!content) { showToast('댓글 내용을 입력해 주세요.', 'warning'); return; }

  const id = db.ref().push().key;
  await db.ref('/posts/' + _currentPostId + '/comments/' + id).set({
    id, content,
    authorName:  _currentUser.name  || '',
    authorEmail: _currentUser.email || '',
    authorUid:   _currentUser.uid   || '',
    role:        _currentUser.role  || 'student',
    createdAt:   new Date().toISOString()
  });
  const el = document.getElementById('my-comment');
  if (el) el.value = '';

  const snap = await db.ref('/posts/' + _currentPostId).once('value');
  renderComments(snap.val() || {}, '#pd-comments', '#pd-reply-cnt', _currentUser?.uid,
    { fn: 'deleteMyComment', canDeleteAll: false });
}

/* ── 내 글/댓글 삭제 ── */
async function deleteMyPost(id) {
  if (!confirm('내 글을 삭제할까요?')) return;
  await db.ref('/posts/' + id).remove();
  closePostDetail_student();
}

async function deleteMyComment(postId, commentId) {
  if (!confirm('댓글을 삭제할까요?')) return;
  await db.ref('/posts/' + postId + '/comments/' + commentId).remove();
  const snap = await db.ref('/posts/' + postId).once('value');
  renderComments(snap.val() || {}, '#pd-comments', '#pd-reply-cnt', _currentUser?.uid,
    { fn: 'deleteMyComment', canDeleteAll: false });
}

// ── 비밀글 체크박스 자동 등록 ──
document.addEventListener('DOMContentLoaded', () => {
  const cb    = document.getElementById('post-secret');
  const wrap  = document.getElementById('secret-pw-wrap');
  if (cb && wrap) {
    cb.addEventListener('change', () => {
      wrap.style.display = cb.checked ? 'block' : 'none';
    });
  }
});

// ── 내부 헬퍼 (DOM 조작 안전 래퍼) ──
function _setInnerText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function _setInnerHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML   = html; }
function _setVal(id, val)        { const el = document.getElementById(id); if (el) el.value        = val;  }
