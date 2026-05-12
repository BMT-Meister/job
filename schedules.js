// ================================================================
//  schedules.js
//  의존 (admin.html 전역): STATE, db, uid(), v(), objToArr(),
//        showToast(), setSyncing(), closeModal(), typeColor()
// ================================================================

/* ── 일정 모달 열기 ── */
function openScheduleModal(id) {
  document.getElementById('sc-id').value = id || '';
  const s   = id ? (STATE.schedules[id] || {}) : {};
  const cos = objToArr(STATE.companies);

  document.getElementById('sc-company').innerHTML =
    '<option value="">-- 기업 --</option>' +
    cos.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const fields = {
    'sc-title':   s.title     || '',
    'sc-company': s.companyId || '',
    'sc-date':    s.date      || '',
    'sc-type':    s.type      || '서류마감',
    'sc-memo':    s.memo      || ''
  };
  Object.entries(fields).forEach(([k, vl]) => {
    const el = document.getElementById(k);
    if (el) el.value = vl;
  });

  document.getElementById('sc-modal').classList.add('open');
}

/* ── 일정 저장 ── */
async function saveSchedule() {
  const title = document.getElementById('sc-title').value.trim();
  const date  = document.getElementById('sc-date').value;
  if (!title || !date) { showToast('제목과 날짜 입력 필요', 'warning'); return; }

  const id = document.getElementById('sc-id').value || uid();
  setSyncing();
  await db.ref('/schedules/' + id).set({
    title,
    date,
    companyId: v('sc-company'),
    type:      v('sc-type'),
    memo:      v('sc-memo')
  });
  closeModal('sc-modal');
  showToast('일정 저장', 'success');
}

/* ── 일정 삭제 ── */
async function deleteSchedule(id) {
  await db.ref('/schedules/' + id).remove();
  showToast('삭제', 'info');
}

/* ── 일정 목록 렌더링 ── */
function renderSchedule() {
  const list  = objToArr(STATE.schedules).sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toISOString().slice(0, 10);

  // 전체 타임라인
  document.getElementById('sched-list').innerHTML = list.length === 0
    ? '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">일정 없음</div></div>'
    : '<div>' + list.map(s => {
        const co     = STATE.companies[s.companyId];
        const isPast = s.date < today;
        return `<div class="timeline-item">
          <div class="timeline-date">${s.date}</div>
          <div class="timeline-dot" style="background:${isPast ? 'var(--text3)' : typeColor(s.type)};"></div>
          <div class="timeline-content">
            <div class="timeline-title" style="${isPast ? 'color:var(--text2);' : ''}">${s.title}</div>
            <div class="timeline-sub">${co ? co.name + ' · ' : ''}${s.type}${s.memo ? ' — ' + s.memo : ''}</div>
          </div>
          <div style="display:flex;gap:3px;">
            <button class="btn btn-icon btn-secondary btn-sm" onclick="openScheduleModal('${s.id}')">✏</button>
            <button class="btn btn-icon btn-danger btn-sm"    onclick="deleteSchedule('${s.id}')">✕</button>
          </div>
        </div>`;
      }).join('') + '</div>';

  // 이번 달
  const ym = new Date().toISOString().slice(0, 7);
  const tm = list.filter(s => s.date.startsWith(ym));
  document.getElementById('this-month').innerHTML = tm.length === 0
    ? '<div class="empty-state"><div class="empty-icon">🗓</div><div class="empty-text">없음</div></div>'
    : '<div>' + tm.map(s => `
        <div class="timeline-item">
          <div class="timeline-date">${s.date.slice(5)}</div>
          <div class="timeline-dot" style="background:${typeColor(s.type)};"></div>
          <div class="timeline-content">
            <div class="timeline-title" style="font-size:12px;">${s.title}</div>
            <div class="timeline-sub"  style="font-size:11px;">${s.type}</div>
          </div>
        </div>`).join('') + '</div>';

  // 캘린더 스트립
  const now       = new Date();
  const strip     = document.getElementById('cal-strip');
  const schedDates= new Set(list.map(s => s.date));
  const days      = [];
  for (let i = -2; i <= 28; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  strip.innerHTML = days.map(d => {
    const ds      = d.toISOString().slice(0, 10);
    const isToday = ds === now.toISOString().slice(0, 10);
    const hasEvent= schedDates.has(ds);
    const wd      = ['일','월','화','수','목','금','토'][d.getDay()];
    return `<div class="cal-day ${isToday ? 'today' : hasEvent ? 'has-event' : ''}">
      <div class="cal-day-wd">${wd}</div>
      <div class="cal-day-num">${d.getDate()}</div>
      ${hasEvent ? '<div class="cal-day-dot"></div>' : '<div style="height:5px;"></div>'}
    </div>`;
  }).join('');
}
