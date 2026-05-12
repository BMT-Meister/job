// ================================================================
//  modal-utils.js
//  공통 모달 유틸리티
//  의존: ui-utils.js (showToast, closeModal)
// ================================================================

/* ── 비밀번호 확인 프롬프트 (Promise 기반) ── */
function promptPassword(msg = '🔒 비밀번호를 입력하세요:') {
  return new Promise(resolve => {
    // 인라인 모달이 있으면 사용, 없으면 prompt fallback
    const modal = document.getElementById('pw-confirm-modal');
    if (!modal) {
      const pw = prompt(msg);
      resolve(pw);
      return;
    }
    const label  = modal.querySelector('.pw-modal-label');
    const input  = document.getElementById('pw-confirm-input');
    const btnOk  = document.getElementById('pw-confirm-ok');
    const btnCxl = document.getElementById('pw-confirm-cancel');
    if (label) label.textContent = msg;
    if (input) input.value = '';
    modal.classList.add('open');
    if (input) setTimeout(() => input.focus(), 100);

    const cleanup = () => { modal.classList.remove('open'); btnOk.onclick = null; btnCxl.onclick = null; };
    btnOk.onclick  = () => { cleanup(); resolve(input ? input.value : null); };
    btnCxl.onclick = () => { cleanup(); resolve(null); };

    // Enter 키
    const onKey = e => {
      if (e.key === 'Enter') { e.preventDefault(); btnOk.click(); }
      if (e.key === 'Escape') { e.preventDefault(); btnCxl.click(); }
    };
    if (input) {
      input.addEventListener('keydown', onKey, { once: true });
    }
  });
}
