// ================================================================
//  uploads.js
//  파일 업로드 모듈 — 추천서 + 게시글 이미지
//  의존: STATE, db, uid(), showToast(), openStudentDetail()
//  ※ Firebase Storage 미사용 → Base64(DataURL) → Realtime DB 저장
//     (Storage 연동 시 이 파일만 수정하면 됨)
// ================================================================

// ── 설정 ──
const UPLOAD_CONFIG = {
  rec: {
    maxBytes:  10 * 1024 * 1024,           // 10 MB
    accept:    ['.pdf','.jpg','.jpeg','.png','.hwp','.doc','.docx'],
    acceptMime: /^(application\/pdf|image\/(jpeg|png)|application\/(msword|vnd\.openxmlformats|haansofthwp|x-hwp))/.source
  },
  postImage: {
    maxBytes:  3 * 1024 * 1024,            // 3 MB
    accept:    ['.jpg','.jpeg','.png','.gif','.webp'],
    acceptMime: /^image\/(jpeg|png|gif|webp)/.source
  }
};

/* ── Promise 기반 FileReader (콜백 지옥 방지 + "업로드 중 멈춤" 버그 해결) ── */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader    = new FileReader();
    reader.onload   = e  => resolve(e.target.result);
    reader.onerror  = () => reject(new Error('파일 읽기 실패: ' + file.name));
    reader.onabort  = () => reject(new Error('파일 읽기가 중단되었습니다.'));
    reader.readAsDataURL(file);
  });
}

/* ── 파일 유효성 검사 ── */
function validateFile(file, config) {
  if (file.size > config.maxBytes) {
    const mb = (config.maxBytes / 1024 / 1024).toFixed(0);
    return `파일이 너무 큽니다. 최대 ${mb}MB까지 가능합니다.`;
  }
  const re = new RegExp(config.acceptMime);
  if (!re.test(file.type) && file.type !== '') {
    return `허용되지 않는 파일 형식입니다. (${config.accept.join(', ')})`;
  }
  return null; // 통과
}

/* ── 추천서 파일 업로드 ── */
async function uploadRecFile(event, studentId) {
  const file     = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('rec-upload-status-' + studentId);
  const setStatus = (msg, color) => {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  };

  // 유효성 검사
  const err = validateFile(file, UPLOAD_CONFIG.rec);
  if (err) { setStatus(err, '#f87171'); showToast(err, 'warning'); event.target.value = ''; return; }

  setStatus('업로드 중...', 'var(--text2)');

  try {
    const data     = await readFileAsDataURL(file);        // ← async 완료 보장
    const existing = STATE.students[studentId] || {};
    const recFiles = [...(existing.recFiles || [])];
    recFiles.push({
      name:       file.name,
      size:       file.size,
      data,
      uploadedAt: new Date().toISOString()
    });

    await db.ref('/students/' + studentId + '/recFiles').set(recFiles);

    // 추천서 상태 자동 업데이트
    if ((existing.recommendation || '미신청') === '미신청') {
      await db.ref('/students/' + studentId + '/recommendation').set('신청');
    }

    setStatus('✅ 업로드 완료', '#4ade80');
    showToast('추천서 파일 업로드 완료', 'success');
    setTimeout(() => openStudentDetail(studentId), 500);
  } catch (e) {
    setStatus('오류: ' + e.message, '#f87171');
    showToast('업로드 실패: ' + e.message, 'warning');
  } finally {
    event.target.value = '';   // input 초기화 (재업로드 허용)
  }
}

/* ── 추천서 파일 삭제 ── */
async function deleteRecFile(studentId, idx) {
  const s = STATE.students[studentId]; if (!s) return;
  const recFiles = [...(s.recFiles || [])];
  recFiles.splice(idx, 1);
  await db.ref('/students/' + studentId + '/recFiles').set(recFiles);
  if (typeof openStudentDetail === 'function') openStudentDetail(studentId);
  showToast('파일 삭제', 'info');
}

/* ── 게시글 이미지 미리보기 ── */
function previewPostImage(e) {
  const file = e.target.files[0]; if (!file) return;

  const err = validateFile(file, UPLOAD_CONFIG.postImage);
  if (err) { showToast(err, 'warning'); e.target.value = ''; return; }

  const reader = new FileReader();
  reader.onload = ev => {
    const src = ev.target.result;
    const preview = document.getElementById('post-img-preview');
    if (!preview) return;
    preview.innerHTML = `
      <div style="position:relative;display:inline-block;margin-top:8px;">
        <img src="${src}" class="post-img" style="max-height:160px;border-radius:6px;cursor:pointer;"
             onclick="viewImage('${src}')">
        <button onclick="removePostImage()"
          style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.65);border:none;
                 color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;
                 font-size:13px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>`;
  };
  reader.readAsDataURL(file);
}

/* ── 게시글 이미지 제거 ── */
function removePostImage() {
  const preview = document.getElementById('post-img-preview');
  const input   = document.getElementById('post-img-input');
  if (preview) preview.innerHTML = '';
  if (input)   input.value = '';
}
