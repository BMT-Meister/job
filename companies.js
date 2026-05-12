// ================================================================
//  companies.js
//  의존 (admin.html 전역): STATE, db, uid(), v(), objToArr(),
//        showToast(), setSyncing(), closeModal(),
//        statusBadge(), stageBadge(), typeBadge(),
//        openCompanyModal (자기 참조), _currentUser
// ================================================================

/* ── 기업 모달 열기 ── */
function openCompanyModal(id) {
  document.getElementById('co-modal-title').textContent = id ? '기업 수정' : '기업 추가';
  document.getElementById('co-id').value = id || '';
  const c = id ? (STATE.companies[id] || {}) : {};
  const fields = {
    'co-name':    c.name       || '',
    'co-type':    c.type       || '공기업',
    'co-job':     c.job        || '',
    'co-hc':      c.headcount  || '',
    'co-start':   c.startDate  || '',
    'co-end':     c.endDate    || '',
    'co-method':  c.applyMethod|| '',
    'co-process': c.process    || '',
    'co-status':  c.status     || '접수예정',
    'co-memo':    c.memo       || '',
    'co-url':     c.url        || ''
  };
  Object.entries(fields).forEach(([k, vl]) => {
    const el = document.getElementById(k);
    if (el) el.value = vl;
  });
  document.getElementById('co-modal').classList.add('open');
}

/* ── 기업 저장 + 접수 마감일 기반 자동 일정 생성 ── */
async function saveCompany() {
  const name = document.getElementById('co-name').value.trim();
  if (!name) { showToast('기업명 입력 필요', 'warning'); return; }

  const id    = document.getElementById('co-id').value || uid();
  const isNew = !document.getElementById('co-id').value;

  const obj = {
    name,
    type:       v('co-type'),
    job:        v('co-job'),
    headcount:  v('co-hc'),
    startDate:  v('co-start'),
    endDate:    v('co-end'),
    applyMethod:v('co-method'),
    process:    v('co-process'),
    status:     v('co-status'),
    memo:       v('co-memo'),
    url:        v('co-url'),
    updatedAt:  new Date().toISOString()
  };

  setSyncing();
  await db.ref('/companies/' + id).set(obj);

  // 신규 기업이고 마감일이 있으면 일정 자동 생성
  if (isNew && obj.endDate) {
    const schedId = uid();
    await db.ref('/schedules/' + schedId).set({
      title:       `${name} 서류 마감`,
      date:        obj.endDate,
      companyId:   id,
      type:        '서류마감',
      memo:        '기업 등록 시 자동 생성',
      autoCreated: true
    });
    showToast(`"${name}" 저장 + 마감 일정 자동 등록`, 'success');
  } else {
    showToast(`"${name}" 저장`, 'success');
  }

  closeModal('co-modal');
}

/* ── 기업 삭제 ── */
async function deleteCompany(id) {
  if (!confirm('기업을 삭제할까요?')) return;
  await db.ref('/companies/' + id).remove();
  showToast('삭제', 'info');
}

/* ── 특채 토글 ── */
async function toggleSpecial(id, current) {
  if (STATE.companies[id]) {
    STATE.companies[id].isSpecial = !current;
    renderCompanies();
  }
  await db.ref('/companies/' + id + '/isSpecial').set(!current);
  showToast(current ? '특채 해제' : '⭐ 특채 지정', 'success');
}

/* ── 기업 목록 렌더링 ── */
function renderCompanies() {
  const q   = (document.getElementById('co-search').value || '').toLowerCase();
  const tf  = document.getElementById('co-type-f').value;
  const sf  = document.getElementById('co-status-f').value;
  const list = objToArr(STATE.companies).filter(c =>
    (!q  || c.name.toLowerCase().includes(q)) &&
    (!tf || c.type   === tf) &&
    (!sf || c.status === sf)
  );

  const grid = document.getElementById('company-grid');
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🏢</div><div class="empty-text">기업 없음</div></div>';
    return;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  grid.innerHTML = list.map(c => {
    const appCnt = objToArr(STATE.students).filter(s =>
      (s.companyIds || []).includes(c.id) ||
      objToArr(s.applications).some(a => a.companyId === c.id)
    ).length;

    let dday = '';
    if (c.endDate) {
      const d = new Date(c.endDate); d.setHours(0, 0, 0, 0);
      const diff = Math.round((d - today) / 86400000);
      if (diff >= 0) dday = `<span class="badge ${diff <= 3 ? 'badge-red' : 'badge-blue'}">${diff === 0 ? 'D-DAY' : 'D-' + diff}</span>`;
    }

    return `<div class="company-card" onclick="openCoDetail('${c.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:9px;">
        <div>
          <div class="company-name">${c.name}</div>
          <div class="company-type-tag">${c.job || '직종 미입력'}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
          <span class="badge ${typeBadge(c.type)}">${c.type}</span>${dday}
        </div>
      </div>
      <div class="company-meta">
        <div class="company-meta-row"><span class="meta-label">📅 마감</span><span style="font-family:var(--mono);font-size:11px;">${c.endDate || '-'}</span></div>
        <div class="company-meta-row"><span class="meta-label">👥 지원</span><span>${appCnt}명</span></div>
      </div>
      <div style="margin-bottom:9px;">
        ${statusBadge(c.status)}
        ${c.isSpecial ? '<span class="badge" style="background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid rgba(251,191,36,.4);margin-left:5px;">⭐ 특채</span>' : ''}
      </div>
      <div class="company-actions">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openCompanyModal('${c.id}')">수정</button>
        <button class="btn btn-danger btn-sm"    onclick="event.stopPropagation();deleteCompany('${c.id}')">삭제</button>
        <button class="btn btn-sm" style="${c.isSpecial
          ? 'background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid rgba(251,191,36,.4);'
          : 'background:var(--surface2);color:var(--text2);border:1px solid var(--border2);'}"
          onclick="event.stopPropagation();toggleSpecial('${c.id}',${!!c.isSpecial})">
          ${c.isSpecial ? '⭐ 특채해제' : '⭐ 특채지정'}
        </button>
        ${c.url ? `<a href="${c.url}" target="_blank" class="btn btn-secondary btn-sm" onclick="event.stopPropagation()">공고↗</a>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ── 기업 상세 패널 ── */
function openCoDetail(id) {
  const c = STATE.companies[id]; if (!c) return;
  document.getElementById('dp-name').textContent = c.name;
  document.getElementById('dp-type').textContent = (c.type || '') + (c.job ? ' · ' + c.job : '');
  document.getElementById('dp-edit').onclick = () => { closeCoPanel(); openCompanyModal(id); };

  const sts      = objToArr(STATE.students).filter(s =>
    (s.companyIds || []).includes(id) ||
    objToArr(s.applications).some(a => a.companyId === id)
  );
  const canManage = ['master', 'employment_teacher'].includes(_currentUser?.role);
  const aw        = c.applyWindow || {};
  const applyees  = c.applyees ? Object.values(c.applyees) : [];
  const now       = new Date().toISOString();
  const isOpen    = aw.enabled && aw.deadline && now <= aw.deadline;

  const applyWindowHtml = canManage ? `
    <div class="detail-section">
      <div class="detail-section-title" style="display:flex;justify-content:space-between;align-items:center;">
        📋 학생 지원 접수 설정
        <span class="badge ${isOpen ? 'badge-green' : 'badge-gray'}">${isOpen ? '접수중' : '미운영'}</span>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:12px;margin-bottom:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-size:11px;color:var(--text2);margin-bottom:4px;">마감 일시</div>
            <input type="datetime-local" id="aw-deadline-${id}" value="${aw.deadline ? aw.deadline.slice(0, 16) : ''}"
              onclick="openDeadlinePicker('${id}')"
              style="width:100%;padding:6px 8px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:12px;">
          </div>
          <div>
            <div style="font-size:11px;color:var(--text2);margin-bottom:4px;">접수 활성화</div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding-top:8px;">
              <input type="checkbox" id="aw-enabled-${id}" ${aw.enabled ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer;">
              <span style="font-size:13px;">학생 지원 받기</span>
            </label>
          </div>
        </div>
        <div style="margin-bottom:8px;">
          <div style="font-size:11px;color:var(--text2);margin-bottom:4px;">안내 메시지 (선택)</div>
          <input type="text" id="aw-msg-${id}" value="${aw.msg || ''}" placeholder="예) 서류 제출 후 지원 클릭"
            style="width:100%;padding:6px 8px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-family:var(--sans);font-size:12px;">
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveApplyWindow('${id}')">💾 설정 저장</button>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:6px;">
        지원자 <strong style="color:var(--text);">${applyees.length}명</strong>
        ${isOpen ? `<span style="color:#fbbf24;"> · 마감: ${aw.deadline.slice(0, 16).replace('T', ' ')}</span>` : ''}
      </div>
      ${applyees.length === 0 ? '<div style="font-size:12px;color:var(--text3);">아직 지원자 없음</div>' :
        applyees.map(a => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:var(--surface2);border-radius:6px;margin-bottom:4px;font-size:12px;">
            <span><strong>${a.name || '?'}</strong> <span style="color:var(--text3);">${a.number || ''} · ${a.classInfo || ''}</span></span>
            <span style="color:var(--text3);font-family:var(--mono);">${(a.appliedAt || '').slice(0, 16).replace('T', ' ')}</span>
          </div>`).join('')}
    </div>` : `
    <div class="detail-section">
      <div class="detail-section-title">📋 학생 지원 접수</div>
      <div style="font-size:13px;color:var(--text2);">지원자 ${applyees.length}명
        ${isOpen ? '<span class="badge badge-green" style="margin-left:6px;">접수중</span>' : ''}
      </div>
    </div>`;

  document.getElementById('dp-body').innerHTML = `
    <div class="detail-section"><div class="detail-section-title">기본 정보</div>
      <div class="detail-row"><span class="detail-key">접수 기간</span><span style="font-family:var(--mono);font-size:11px;">${c.startDate || '-'} ~ ${c.endDate || '-'}</span></div>
      <div class="detail-row"><span class="detail-key">채용 인원</span><span>${c.headcount ? c.headcount + '명' : '-'}</span></div>
      <div class="detail-row"><span class="detail-key">접수 방법</span><span>${c.applyMethod || '-'}</span></div>
      <div class="detail-row"><span class="detail-key">상태</span>${statusBadge(c.status)}</div>
      ${c.url ? `<div class="detail-row"><span class="detail-key">공고</span><a href="${c.url}" target="_blank" style="color:var(--accent2);">바로가기↗</a></div>` : ''}
    </div>
    ${c.process ? `<div class="detail-section"><div class="detail-section-title">전형 절차</div><div style="font-size:13px;color:var(--text2);line-height:1.8;">${c.process.replace(/\n/g, '<br>')}</div></div>` : ''}
    ${c.memo    ? `<div class="detail-section"><div class="detail-section-title">메모</div><div style="font-size:13px;color:var(--text2);">${c.memo}</div></div>` : ''}
    ${applyWindowHtml}
    <div class="detail-section"><div class="detail-section-title">관리 학생 지원 현황 (${sts.length}명)</div>
      ${sts.length === 0 ? '<div style="font-size:12px;color:var(--text3);">없음</div>' :
        sts.map(s => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(48,54,61,.4);">
            <div>
              <div style="font-weight:600;font-size:13px;">${s.name} <span style="color:var(--text3);font-size:11px;">${s.number || ''}</span></div>
              <div style="font-size:11px;color:var(--text2);">${s.dept || ''}</div>
            </div>
            ${stageBadge(s.status)}
          </div>`).join('')}
    </div>`;

  document.getElementById('co-overlay').classList.add('open');
  document.getElementById('co-panel').classList.add('open');
}

/* ── 지원 접수 설정 저장 ── */
async function saveApplyWindow(companyId) {
  const deadline = document.getElementById(`aw-deadline-${companyId}`)?.value;
  const enabled  = document.getElementById(`aw-enabled-${companyId}`)?.checked;
  const msg      = document.getElementById(`aw-msg-${companyId}`)?.value || '';
  if (!deadline) { showToast('마감 일시를 입력해 주세요', 'warning'); return; }
  await db.ref(`/companies/${companyId}/applyWindow`).set({
    deadline: new Date(deadline).toISOString(),
    enabled:  !!enabled,
    msg
  });
  showToast('지원 접수 설정 저장', 'success');
}

function openDeadlinePicker(companyId) {
  const input = document.getElementById(`aw-deadline-${companyId}`);
  if (!input) return;
  input.focus();
  if (typeof input.showPicker === 'function') input.showPicker();
  else input.click();
}

/* ── 기업 상세 패널 닫기 ── */
function closeCoPanel() {
  document.getElementById('co-overlay').classList.remove('open');
  document.getElementById('co-panel').classList.remove('open');
}
