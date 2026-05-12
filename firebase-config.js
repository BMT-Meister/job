// ================================================================
//  firebase-config.js
//  Firebase 설정 + 전역 상수 — 모든 HTML에서 가장 먼저 로드
//
//  initializeApp 호출 위치:
//    - index.html  : 인라인 <script>에서 호출
//    - admin.html  : js/app.js 에서 호출
//    - student.html: 인라인 <script>에서 호출
//  ※ 각 HTML은 독립 페이지이므로 중복 호출 없음
//  ※ 동일 페이지에서 2회 호출 시 Firebase 오류 발생 → 각 파일에서 1회만 호출
// ================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCHYyGzt5iuZB-yZbFzqdxPsdp98OwMtuI",
  authDomain: "bmt-meister-job.firebaseapp.com",
  databaseURL: "https://bmt-meister-job-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bmt-meister-job",
  storageBucket: "bmt-meister-job.firebasestorage.app",
  messagingSenderId: "1079853580021",
  appId: "1:1079853580021:web:3e7b9588a006f8d1cf0fbc",
  measurementId: "G-11G4P5YX7M"
};

// ── 학교 설정 ──
const SCHOOL_NAME    = "부산기계공업고등학교";
const ALLOWED_DOMAIN = "bmt.hs.kr";
const MASTER_EMAIL   = "bmt2607@bmt.hs.kr";

// ── EmailJS 설정 (index.html 회원가입 인증번호 발송용) ──
const EMAILJS_CONFIG = {
  serviceId:  "service_52ofr8w",
  templateId: "template_u3ts08q",
  publicKey:  "Ezt3dzfWaP8CkhhdZ"
};

// ── 학과 목록 (전체 공통) ──
const DEPT_LIST = [
  "기계시스템과",
  "설비시스템과",
  "스마트팩토리과(로봇)",
  "스마트팩토리과(메카)",
  "전기과"
];

