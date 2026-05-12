// ================================================================
//  students.js
//  의존: STATE, ME, db, uid(), objToArr(), v(), showToast(),
//        setSyncing(), closeModal(), recBadge(), stageBadge(),
//        renderManualTags(), switchCompanyTab(),
//        openApplicationModal(), openStudentDetail(), closeSdPanel()
// ================================================================

/* ── 학생 모달 열기 ── */
function openStudentModal(id) {
  document.getElementById('st-modal-title').textContent = id ? '학생 수정' : '학생 추가';
  document.getElementById('st-id').value = id || '';
  const s = id ? (STATE.students[id] || {}) : {};

  document.getElementById('st-name').value  = s.name  || '';
  document.getElementById('st-dept').value  = s.dept  || '';
  document.getElementById('st-phone').value = s.phone || '';
  document.getElementById('st-memo').value  = s.memo  || '';

  // 학번 GCCNN 역파싱
  const num = String(s.number || '');
  if (num.length === 5) {
    document.getElementById('st-grade').value    = num[0];
    document.getElementById('st-classnum').value = parseInt(num.slice(1, 3));
    document.getElementById('st-order').value    = parseInt(num.slice(3, 5));
  } else {
    document.getElementById('st-grade').value    = '';
    document.getElementById('st-classnum').value = '';
    document.getElementById('st-order').value    = '';
  }
  previewStudentNum();

  const cos    = objToArr(STATE.companies);
  const cb     = document.getElementById('st-co-checks');
  const selIds = s.companyIds || [];
  cb.innerHTML = cos.length === 0
    ? '<span style="color:var(--text3);font-size:12px;">등록된 기업 없음</span>'
    : cos.map(c =>
        `<label style="display:flex;align-items:center;gap:3px;font-size:12px;cursor:pointer;padding:2px 7px;background:var(--surface3);border-radius:4px;">
           <input type="checkbox" value="${c.id}" ${selIds.includes(c.id) ? 'checked' : ''} style="cursor:pointer;"> ${c.name}
         </label>`
      ).join('');

  window._manualCos = s.manualCompanies ? [...s.manualCompanies] : [];
  document.getElementById('st-co-manual').value = '';
  renderManualTags();
  switchCompanyTab(window._manualCos.length > 0 ? 'manual' : 'registered');
  document.getElementById('st-modal').classList.add('open');
}

/* ── 학생 저장 ── */
async function saveStudent() {
  const name = document.getElementById('st-name').value.trim();
  if (!name) { showToast('이름 입력 필요', 'warning'); return; }

  const g  = document.getElementById('st-grade').value;
  const cl = String(document.getElementById('st-classnum').value || '').padStart(2, '0');
  const or = String(document.getElementById('st-order').value    || '').padStart(2, '0');
  if (!g || cl === '00' || or === '00') { showToast('학년·반·번호를 모두 입력해 주세요', 'warning'); return; }

  const autoNum   = g + cl + or;
  const classInfo = g + '-' + parseInt(cl);
  const id        = document.getElementById('st-id').value || uid();

  const checkedIds = Array.from(document.querySelectorAll('#st-co-checks input:checked')).map(i => i.value);
  const manualRaw  = document.getElementById('st-co-manual').value.trim();
  if (manualRaw) {
    manualRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(n => {
      if (!window._manualCos.includes(n)) window._manualCos.push(n);
    });
  }
  const existing = STATE.students[id] || {};

  const obj = {
    name,
    number:          autoNum,
    grade:           parseInt(g),
    classNum:        parseInt(cl),
    orderNum:        parseInt(or),
    classInfo,
    dept:            v('st-dept'),
    phone:           v('st-phone'),
    memo:            v('st-memo'),
    companyIds:      checkedIds,
    manualCompanies: window._manualCos || [],
    applications:    existing.applications   || {},
    recommendation:  existing.recommendation || '미신청',
    status:          existing.status         || '준비중',
    updatedAt:       new Date().toISOString()
  };

  setSyncing();
  await db.ref('/students/' + id).set(obj);
  closeModal('st-modal');
  showToast(`"${name}" (학번 ${autoNum}) 저장`, 'success');
}

/* ── 학생 삭제 ── */
async function deleteStudent(id) {
  if (!confirm('학생을 삭제할까요?')) return;
  await db.ref('/students/' + id).remove();
  showToast('삭제', 'info');
}

/* ── 학생 목록 렌더링 ── */
function renderStudents(resetPage) {
  // admin.html 내부 script에 동일 함수가 정의되어 있음 — 그쪽이 우선 실행됨
  // student.html 단독 사용 시 이 함수가 동작함 (페이지네이션 없이 전체 표시)
  if (resetPage && typeof window._stPage !== 'undefined') window._stPage = 1;
  const q  = (document.getElementById('st-search').value || '').toLowerCase();
  const df = document.getElementById('st-dept-f').value;
  const cf = document.getElementById('st-class-f').value;
  const rf = document.getElementById('st-rec-f').value;
  const sf = document.getElementById('st-status-f').value;
  const so = (document.getElementById('st-sort-f') || {}).value || 'class';

  let list = objToArr(STATE.students).filter(s =>
    (!q  || s.name.toLowerCase().includes(q) || (s.number || '').includes(q)) &&
    (!df || s.dept      === df) &&
    (!cf || s.classInfo === cf) &&
    (!rf || s.recommendation === rf) &&
    (!sf || s.status    === sf)
  );

  list.sort((a, b) => {
    if (so === 'number') return String(a.number||'').localeCompare(String(b.number||''), undefined, {numeric:true});
    if (so === 'name')   return (a.name||'').localeCompare(b.name||'', 'ko');
    if (so === 'dept') {
      const dd = (a.dept||'').localeCompare(b.dept||'', 'ko');
      if (dd !== 0) return dd;
    }
    const ca = a.classInfo||'', cb = b.classInfo||'';
    const pa = ca.match(/(\d+)-(\d+)/), pb = cb.match(/(\d+)-(\d+)/);
    if (pa && pb) {
      const d = +pa[1] - +pb[1] || +pa[2] - +pb[2];
      if (d !== 0) return d;
    } else if (ca !== cb) return ca.localeCompare(cb, 'ko');
    return (a.name||'').localeCompare(b.name||'', 'ko');
  });

  const tbody = document.getElementById('student-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-text">학생 없음</div></div></td></tr>`;
    return;
  }

  // 가입 여부 매핑 (개선)
  const userByNumber = {};
  const userByName   = {};
  objToArr(STATE.users).forEach(u => {
    const local = (u.email||'').split('@')[0];
    if (u.number)    userByNumber[String(u.number)]    = u;
    if (u.studentId) userByNumber[String(u.studentId)] = u;
    if (/^\d{4,6}$/.test(local)) userByNumber[local]   = u;
    if (u.name)      userByName[u.name.trim()]          = u;
  });

  tbody.innerHTML = list.map(s => {
    const chips = (s.companyIds || []).map(cid => {
      const c = STATE.companies[cid];
      return c ? `<span class="chip">${c.name}</span>` : '';
    }).join('') + (s.manualCompanies || []).map(n =>
      `<span class="chip" style="border-color:rgba(251,191,36,.3);color:#fbbf24;">${n}</span>`
    ).join('');
    const regUser  = userByNumber[String(s.number||'')] || (s.name ? userByName[s.name.trim()] : null);
    const regBadge = regUser
      ? `<span class="badge badge-green">가입</span>`
      : `<span class="badge badge-gray">미가입</span>`;
    return `<tr style="cursor:pointer;" onclick="openStudentDetail('${s.id}')">
      <td style="font-family:var(--mono);font-size:11px;">${s.number || '-'}</td>
      <td style="font-weight:600;">${s.name}</td>
      <td>${s.dept || ''} ${s.classInfo || ''}</td>
      <td><div class="chip-wrap">${chips || '<span style="color:var(--text3);font-size:11px;">없음</span>'}</div></td>
      <td>${recBadge(s.recommendation)}</td>
      <td>${stageBadge(s.status)}</td>
      <td>${regBadge}</td>
      <td onclick="event.stopPropagation();">
        <div style="display:flex;gap:3px;">
          <button class="btn btn-secondary btn-sm" onclick="openStudentModal('${s.id}')">수정</button>
          <button class="btn btn-danger btn-sm"    onclick="deleteStudent('${s.id}')">삭제</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── 필터 드롭다운 업데이트 ── */
function updateFilters() {
  const sts     = objToArr(STATE.students);
  const depts   = [...new Set(sts.map(s => s.dept).filter(Boolean))].sort();
  const classes = [...new Set(sts.map(s => s.classInfo).filter(Boolean))].sort((a, b) => {
    const pa = a.match(/(\d+)-(\d+)/), pb = b.match(/(\d+)-(\d+)/);
    if (pa && pb) return pa[1] !== pb[1] ? +pa[1] - +pb[1] : +pa[2] - +pb[2];
    return a.localeCompare(b, 'ko');
  });
  const dSel = document.getElementById('st-dept-f');
  const cSel = document.getElementById('st-class-f');
  const dv   = dSel.value, cv = cSel.value;
  dSel.innerHTML = '<option value="">전체 학과</option>' + depts.map(d   => `<option value="${d}">${d}</option>`).join('');
  cSel.innerHTML = '<option value="">전체 반</option>'   + classes.map(c => `<option value="${c}">${c}</option>`).join('');
  dSel.value = dv; cSel.value = cv;
}

/* ── 학생 상세 패널 ── */
function openStudentDetail(id) {
  const s = STATE.students[id]; if (!s) return;
  document.getElementById('sdp-name').textContent = s.name;
  document.getElementById('sdp-sub').textContent  = `${s.number || ''} · ${s.dept || ''} ${s.classInfo || ''}`;
  document.getElementById('sdp-edit').onclick = () => { closeSdPanel(); openStudentModal(id); };
  document.getElementById('sdp-add').onclick  = () => openApplicationModal(id);

  const apps = objToArr(s.applications || {}).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const recFiles = s.recFiles || [];
  const recHtml  = `
    <div class="detail-row"><span class="detail-key">상태</span>${recBadge(s.recommendation)}</div>
    <div style="margin-top:6px;">
      <div style="font-size:11px;color:var(--text3);margin-bottom:5px;">첨부 파일 (${recFiles.length})</div>
      ${recFiles.map((f, i) => `
        <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:12px;">
          <span>📄</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.name}</span>
          <a href="${f.data}" download="${f.name}" class="btn btn-secondary btn-sm">⬇</a>
          <button class="btn btn-danger btn-sm" onclick="deleteRecFile('${id}',${i})">✕</button>
        </div>`).join('')}
      <label style="display:inline-flex;align-items:center;gap:5px;margin-top:4px;padding:5px 10px;border:1px dashed var(--border2);border-radius:6px;font-size:12px;color:var(--text2);cursor:pointer;transition:all .15s;"
             onmouseover="this.style.borderColor='var(--accent2)';this.style.color='var(--accent2)'"
             onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--text2)'">
        📎 추천서 파일 첨부
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.hwp,.doc,.docx" style="display:none" onchange="uploadRecFile(event,'${id}')">
      </label>
      <div id="rec-upload-status-${id}" style="font-size:11px;color:var(--text2);margin-top:4px;"></div>
    </div>`;

  document.getElementById('sdp-body').innerHTML = `
    <div class="detail-section"><div class="detail-section-title">학생 정보</div>
      <div class="detail-row"><span class="detail-key">학과/반</span><span>${s.dept || '-'} / ${s.classInfo || '-'}</span></div>
      <div class="detail-row"><span class="detail-key">연락처</span><span style="font-family:var(--mono);">${s.phone || '-'}</span></div>
      <div class="detail-row"><span class="detail-key">현황</span>${stageBadge(s.status)}</div>
      ${s.memo ? `<div class="detail-row"><span class="detail-key">메모</span><span style="color:var(--text2);">${s.memo}</span></div>` : ''}
    </div>
    <div class="detail-section"><div class="detail-section-title">🏫 학교장 추천서</div>${recHtml}</div>
    <div class="detail-section"><div class="detail-section-title">지원 내역 (${apps.length}건)</div>
      ${(s.manualCompanies || []).length > 0
        ? `<div style="margin-bottom:9px;">
             <div style="font-size:11px;color:var(--text3);margin-bottom:5px;">수기 입력 기업</div>
             <div style="display:flex;flex-wrap:wrap;gap:4px;">${(s.manualCompanies || []).map(n => `<span class="badge badge-yellow">${n}</span>`).join('')}</div>
           </div>` : ''}
      ${apps.length === 0
        ? '<div style="font-size:12px;color:var(--text3);padding:7px 0;">없음. [+ 지원 추가] 클릭</div>'
        : apps.map(a => {
            const co      = STATE.companies[a.companyId];
            const coLabel = co ? (co.job ? `${co.name}(${co.job})` : co.name) : '(삭제된 기업)';
            return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:11px;margin-bottom:7px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;">
                <div style="font-weight:700;font-size:14px;cursor:pointer;color:var(--accent2);text-decoration:underline;"
                     onclick="openApplicationModal('${id}','${a.id}')">${coLabel}</div>
                <div style="display:flex;gap:4px;">${stageBadge(a.stage)}<button class="btn btn-danger btn-sm" onclick="deleteApplication('${id}','${a.id}')">✕</button></div>
              </div>
              <div style="font-size:12px;color:var(--text2);line-height:1.8;">
                지원일: <span style="font-family:var(--mono);">${a.date || '-'}</span><br>
                추천서: ${recBadge(a.rec)}
                ${a.memo ? `<br><span style="color:var(--text);">${a.memo}</span>` : ''}
              </div>
            </div>`;
          }).join('')}
    </div>`;

  document.getElementById('sd-overlay').classList.add('open');
  document.getElementById('sd-panel').classList.add('open');
}

function closeSdPanel() {
  document.getElementById('sd-overlay').classList.remove('open');
  document.getElementById('sd-panel').classList.remove('open');
}
