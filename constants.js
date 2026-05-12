// ================================================================
//  constants.js
//  전역 상수 — admin.html / student.html 공통 사용
//  로드 순서: 가장 먼저 (firebase-config.js 다음)
// ================================================================

/* ── 역할 ── */
const ROLES = {
  MASTER:             'master',
  EMPLOYMENT_TEACHER: 'employment_teacher',
  GENERAL_TEACHER:    'general_teacher',
  STUDENT:            'student',
  PENDING:            'pending'
};

const TEACHER_ROLE_LIST = ['master', 'employment_teacher', 'general_teacher'];

const ROLE_LABELS = {
  master:             '마스터',
  employment_teacher: '취업지원부',
  general_teacher:    '일반교사',
  student:            '학생',
  pending:            '승인대기'
};

/* ── 지원 단계 ── */
const STAGES = ['서류접수', '필기전형', '면접전형', '합격', '최종합격', '불합격', '준비중'];

/* ── 기업 유형 ── */
const COMPANY_TYPES = ['대기업', '공기업', '중소·중견', '공무원'];

/* ── 추천서 상태 ── */
const REC_STATES = ['미신청', '신청', '발급완료', '불필요'];

/* ── 파일 제한 ── */
const FILE_LIMITS = {
  PROFILE_PHOTO: 2  * 1024 * 1024,   //  2 MB
  REC_FILE:      10 * 1024 * 1024,   // 10 MB
  POST_IMAGE:     3 * 1024 * 1024    //  3 MB
};

const ALLOWED_EXT = {
  REC:       ['.pdf', '.jpg', '.jpeg', '.png', '.hwp', '.doc', '.docx'],
  POST_IMG:  ['.jpg', '.jpeg', '.png', '.gif', '.webp']
};

/* ── 게시판 필터 ── */
const BOARD_FILTERS = ['전체', '미답변', '답변완료'];

/* ── 학과 목록 ── */
const DEPT_LIST_CONST = [
  '기계시스템과',
  '설비시스템과',
  '스마트팩토리과(로봇)',
  '스마트팩토리과(메카)',
  '전기과'
];
