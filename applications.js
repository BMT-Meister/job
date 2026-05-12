// ================================================================
//  applications.js
//  의존: STATE, db, uid(), objToArr(), v(), showToast(),
//        setSyncing(), closeModal(),
//        openStudentDetail()  ← students.js 에서 제공
// ================================================================

/* ── 지원 모달 열기 ── */
function openApplicationModal(sid, editAppId) {
  document.getElementById('app-sid').value = sid;
  document.getElementById('app-id').value  = editAppId || '';
  document.getElementById('app-modal-title').textContent = editAppId ? '지원 이력 수정' : '지원 내역 추가';

  // 기업 select: 기업명(직종) 병기
  const cos = objToArr(STATE.companies);
  document.getElementById('app-company').innerHTML = cos.map(c => {
    const label = c.job ? `${c.name}(${c.job})` : c.name;
    return `<option value="${c.id}">${label}</option>`;
  }).join('');

  if (editAppId) {
    const a = (((STATE.students[sid] || {}).applications || {})[editAppId]) || {};
    document.getElementById('app-company').value = a.companyId || '';
    document.getElementById('app-date').value    = a.date      || '';
    document.getElementById('app-rec').value     = a.rec       || '불필요';
    document.getElementById('app-stage').value   = a.stage     || '준비중';
    document.getElementById('app-memo').value    = a.memo      || '';
  } else {
    document.getElementById('app-date').value  = new Date().toISOString().slice(0, 10);
    document.getElementById('app-rec').value   = '불필요';
    document.getElementById('app-stage').value = '준비중';
    document.getElementById('app-memo').value  = '';
  }

  document.getElementById('app-modal').classList.add('open');
}

/* ── 지원 저장 ── */
async function saveApplication() {
  const sid = document.getElementById('app-sid').value;
  const cid = document.getElementById('app-company').value;
  if (!cid) { showToast('기업 선택 필요', 'warning'); return; }

  const editId   = document.getElementById('app-id').value;
  const id       = editId || uid();
  const existing = editId ? (((STATE.students[sid] || {}).applications || {})[editId] || {}) : {};

  const obj = {
    companyId: cid,
    date:      v('app-date'),
    rec:       v('app-rec'),
    stage:     v('app-stage'),
    memo:      v('app-memo'),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  setSyncing();
  await db.ref('/students/' + sid + '/applications/' + id).set(obj);

  // 기업 ID를 학생의 companyIds에도 추가
  const s   = STATE.students[sid] || {};
  const ids = s.companyIds || [];
  if (!ids.includes(cid)) await db.ref('/students/' + sid + '/companyIds').set([...ids, cid]);

  closeModal('app-modal');
  openStudentDetail(sid);
  showToast(editId ? '지원 이력 수정' : '지원 추가', 'success');
}

/* ── 지원 삭제 ── */
async function deleteApplication(sid, aid) {
  await db.ref('/students/' + sid + '/applications/' + aid).remove();
  openStudentDetail(sid);
  showToast('삭제', 'info');
}
