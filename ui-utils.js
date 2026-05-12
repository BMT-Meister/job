// ================================================================
//  ui-utils.js  v2
//  공통 UI 유틸리티 — admin.html / student.html 양쪽에서 사용
// ================================================================

/* ── 토스트 메시지 ── */
function showToast(msg, type = 'info') {
  const icons = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '🚨' };
  // toast-wrap 없으면 자동 생성 (student 호환)
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:6px;';
    document.body.appendChild(wrap);
  }
  const el     = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── 에러 표시 (showToast 래퍼) ── */
function showError(msg) { showToast(msg, 'warning'); }

/* ── 모달 닫기/열기 ── */
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }
function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('open'); }

/* ── 날짜 포맷 ── */
function fmtDate(iso)     { return iso ? iso.slice(0, 10) : '-'; }
function fmtDateTime(iso) { return iso ? iso.slice(0, 16).replace('T', ' ') : '-'; }

/* ── 로딩 오버레이 ── */
function showLoading(msg = '로딩 중...') {
  let el = document.getElementById('loading');
  if (!el) el = document.getElementById('loading-overlay');
  if (el) { el.style.display = 'flex'; }
  const t = el?.querySelector('.loading-text');
  if (t) t.textContent = msg;
}
function hideLoading() {
  let el = document.getElementById('loading');
  if (!el) el = document.getElementById('loading-overlay');
  if (el) el.style.display = 'none';
}

/* ── 이미지 전체화면 보기 ── */
function viewImage(src) {
  const viewer = document.getElementById('img-viewer');
  const img    = document.getElementById('img-viewer-src');
  if (viewer && img) { img.src = src; viewer.classList.add('open'); }
  else window.open(src, '_blank');
}

/* ── async 함수 공통 에러 래퍼 ──
   사용법: const result = await tryCatch(someAsyncFn());
   DB 오류 시 toast 자동 표시, null 반환 ── */
async function tryCatch(promise, errMsg = '오류가 발생했습니다.') {
  try {
    return await promise;
  } catch (e) {
    const msg = e?.message || errMsg;
    showToast(
      msg.includes('PERMISSION_DENIED') ? '권한이 없습니다.' :
      msg.includes('network')           ? '네트워크 오류입니다.' : msg,
      'warning'
    );
    console.error('[tryCatch]', e);
    return null;
  }
}

/* ── Firebase async 작업 공통 래퍼 (setSyncing 연동) ── */
async function dbOp(promise, successMsg = null) {
  if (typeof setSyncing === 'function') setSyncing();
  const result = await tryCatch(promise);
  if (typeof setSyncOk === 'function') setSyncOk();
  if (result !== null && successMsg) showToast(successMsg, 'success');
  return result;
}

/* ── 이벤트 리스너 중복 등록 방지 ──
   el._evtHandlers 맵으로 추적, 같은 type+key 는 재등록 전에 제거 ── */
function safeAddListener(el, type, handler, key = '') {
  if (!el) return;
  if (!el._evtHandlers) el._evtHandlers = {};
  const k = type + '_' + (key || handler.name || 'anonymous');
  if (el._evtHandlers[k]) el.removeEventListener(type, el._evtHandlers[k]);
  el._evtHandlers[k] = handler;
  el.addEventListener(type, handler);
}

/* ── Firebase 리스너 중복 방지 (ref별 1회만 등록) ──
   사용법: safeDbOn(db.ref('/posts'), 'value', handler) ── */
const _dbListeners = new Map();
function safeDbOn(ref, event, handler) {
  const key = ref.toString() + ':' + event;
  if (_dbListeners.has(key)) {
    _dbListeners.get(key).ref.off(event, _dbListeners.get(key).handler);
  }
  ref.on(event, handler);
  _dbListeners.set(key, { ref, handler });
}

/* ── 모달 오버레이 클릭 시 닫기 (DOMContentLoaded 후 자동 등록) ── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });
});
