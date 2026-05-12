// ================================================================
//  helpers.js
//  공통 헬퍼 함수 — admin.html / student.html 공통 사용
//  의존: constants.js (배지 색상 참조)
//  로드 순서: constants.js 다음
// ================================================================

/* ── Firebase 키 생성 ── */
function uid() { return db.ref().push().key; }

/* ── 객체 → 배열 변환 ── */
function objToArr(o) {
  return o ? Object.entries(o).map(([id, v]) => ({ ...v, id })) : [];
}

/* ── input 값 가져오기 ── */
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

/* ── 날짜 포맷 ── */
function fmtDate(iso)     { return iso ? iso.slice(0, 10) : '-'; }
function fmtDateTime(iso) { return iso ? iso.slice(0, 16).replace('T', ' ') : '-'; }

/* ── 학번 생성 (학년G + 반CC + 번호NN → 5자리) ── */
function makeStudentNumber(grade, classNum, orderNum) {
  return String(grade) +
    String(classNum).padStart(2, '0') +
    String(orderNum).padStart(2, '0');
}

/* ── Debounce ── */
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── D-Day 레이블 ── */
function ddayLabel(endDate) {
  if (!endDate) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(endDate); d.setHours(0, 0, 0, 0);
  const diff  = Math.round((d - today) / 86400000);
  if (diff < 0)  return '<span class="badge badge-gray">마감</span>';
  if (diff === 0) return '<span class="badge badge-red">D-DAY</span>';
  if (diff <= 3)  return `<span class="badge badge-red">D-${diff}</span>`;
  if (diff <= 7)  return `<span class="badge badge-yellow">D-${diff}</span>`;
  return `<span class="badge badge-blue">D-${diff}</span>`;
}

/* ── 뱃지 헬퍼 ── */
function typeBadge(t) {
  return { 대기업: 'badge-purple', 공기업: 'badge-blue', '중소·중견': 'badge-green', 공무원: 'badge-yellow' }[t] || 'badge-gray';
}

function statusBadge(s) {
  const m = { 접수중: 'badge-green', 접수예정: 'badge-blue', 접수마감: 'badge-red' };
  return `<span class="badge ${m[s] || 'badge-gray'}">${s || '-'}</span>`;
}

function stageBadge(s) {
  const m = {
    최종합격: 'badge-green', 합격: 'badge-green',
    면접전형: 'badge-purple', 필기전형: 'badge-yellow',
    서류접수: 'badge-blue',  불합격: 'badge-red', 준비중: 'badge-gray'
  };
  return `<span class="badge ${m[s] || 'badge-gray'}">${s || '-'}</span>`;
}

function recBadge(s) {
  const m = { 발급완료: 'badge-green', 신청: 'badge-yellow', 미신청: 'badge-gray', 불필요: 'badge-gray' };
  return `<span class="badge ${m[s] || 'badge-gray'}">${s || '-'}</span>`;
}

function typeColor(t) {
  return {
    서류마감: '#f87171', 필기시험: '#fbbf24',
    면접: '#a78bfa', 합격발표: '#4ade80', 기타: '#94a3b8'
  }[t] || '#94a3b8';
}

function roleBadge(r) {
  const m = {
    master: 'badge-purple', employment_teacher: 'badge-blue',
    general_teacher: 'badge-teal', student: 'badge-green', pending: 'badge-yellow'
  };
  return `<span class="badge ${m[r] || 'badge-gray'}">${ROLE_LABELS[r] || r}</span>`;
}
