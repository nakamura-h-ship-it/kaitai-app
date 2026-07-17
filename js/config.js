// ============================================================
//  解体案件管理アプリ - 設定ファイル
// ============================================================

// ===== Firebase 設定 =====
// daily-report-app と同じFirebaseプロジェクトを流用しています。
// このアプリ専用のコレクション（demolitionCases）にデータを保存します。
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyB-E373ZjYEB0eLR-EAGhnsLFGV4S-TY_o",
  authDomain:        "dailyreport-e172a.firebaseapp.com",
  projectId:         "dailyreport-e172a",
  storageBucket:     "dailyreport-e172a.firebasestorage.app",
  messagingSenderId: "824102097035",
  appId:             "1:824102097035:web:c71f8a86bae0ea79d3c48e"
};

const CASES_COLLECTION = 'demolitionCases';

// ===== ステータス定義 =====
// key: Firestoreのstatusフィールド値。順番は業務フローの順番と一致させること
const STATUSES = [
  { key: 'inquiry',      label: '見積もり依頼受付', color: '#1565C0' },
  { key: 'requesting',   label: '業者へ依頼中',     color: '#00838F' },
  { key: 'siteVisit',    label: '現地立会い待ち',   color: '#6A1B9A' },
  { key: 'quoted',       label: '金額回答済み',     color: '#E65100' },
  { key: 'waitingStart', label: '着工待ち',         color: '#AD1457' },
  { key: 'inProgress',   label: '着工中',           color: '#C62828' },
  { key: 'completed',    label: '完工',             color: '#2E7D32' },
];

function getStatusInfo(key) {
  return STATUSES.find(s => s.key === key) || STATUSES[0];
}

// ============================================================
//  以下は変更不要
// ============================================================

// Firebase 初期化
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// ===== ユーティリティ =====

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 'YYYY-MM-DD' -> '2026年7月17日(金)'
function formatDateJP(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return dateStr;
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${y}年${parseInt(m)}月${parseInt(d)}日(${days[date.getDay()]})`;
}

function tsMillis(ts) {
  return (ts && typeof ts.toMillis === 'function') ? ts.toMillis() : 0;
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
