// calendar.html（カレンダー）の処理
// 案件の着工予定日・完工予定日などを CALENDAR_EVENTS の定義に従って自動表示する

(function () {
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth(); // 0始まり
  let selectedDate = getTodayString();
  let eventsByDate = {}; // 'YYYY-MM-DD' -> [{ caseId, siteName, event }]

  function init() {
    document.getElementById('cal-prev').addEventListener('click', () => moveMonth(-1));
    document.getElementById('cal-next').addEventListener('click', () => moveMonth(1));
    document.getElementById('cal-today').addEventListener('click', () => {
      viewYear = now.getFullYear();
      viewMonth = now.getMonth();
      selectedDate = getTodayString();
      render();
    });
    renderLegend();
    loadEvents();
  }

  async function loadEvents() {
    try {
      const snapshot = await db.collection(CASES_COLLECTION).get();
      eventsByDate = {};
      snapshot.forEach(doc => {
        const c = doc.data();
        if (c.status === LOST_STATUS_KEY) return; // 没案件は表示しない
        CALENDAR_EVENTS.forEach(ev => {
          const date = c[ev.field];
          if (!date) return;
          (eventsByDate[date] = eventsByDate[date] || []).push({
            caseId: doc.id,
            siteName: c.siteName || '(名称未設定)',
            event: ev,
          });
        });
      });
      render();
    } catch (e) {
      console.error('案件取得エラー:', e);
      document.getElementById('cal-grid').innerHTML = '<div class="empty-state"><div class="empty-text">データを取得できませんでした</div></div>';
    }
  }

  function moveMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    render();
  }

  function render() {
    renderGrid();
    renderDayDetail();
  }

  function renderLegend() {
    document.getElementById('cal-legend').innerHTML = CALENDAR_EVENTS.map(ev =>
      `<span class="cal-legend-item"><span class="cal-dot" style="background:${ev.color}"></span>${ev.label}予定</span>`
    ).join('');
  }

  function toDateString(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function renderGrid() {
    document.getElementById('cal-month-label').textContent = `${viewYear}年${viewMonth + 1}月`;

    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = getTodayString();

    const cells = WEEKDAYS.map((w, i) =>
      `<div class="cal-weekday ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</div>`
    );
    for (let i = 0; i < firstWeekday; i++) cells.push('<div class="cal-cell empty"></div>');

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateString(viewYear, viewMonth, d);
      const weekday = (firstWeekday + d - 1) % 7;
      const events = eventsByDate[dateStr] || [];
      const classes = ['cal-cell'];
      if (weekday === 0) classes.push('sun');
      if (weekday === 6) classes.push('sat');
      if (dateStr === today) classes.push('today');
      if (dateStr === selectedDate) classes.push('selected');

      const shown = events.slice(0, 2).map(e =>
        `<div class="cal-event" style="background:${e.event.color}">${e.event.label} ${escapeHtml(e.siteName)}</div>`
      ).join('');
      const more = events.length > 2 ? `<div class="cal-more">+${events.length - 2}件</div>` : '';

      cells.push(`<div class="${classes.join(' ')}" data-date="${dateStr}"><div class="cal-day-num">${d}</div>${shown}${more}</div>`);
    }

    const gridEl = document.getElementById('cal-grid');
    gridEl.innerHTML = cells.join('');
    gridEl.querySelectorAll('[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        selectedDate = cell.dataset.date;
        render();
      });
    });
  }

  function renderDayDetail() {
    const detailEl = document.getElementById('cal-day-detail');
    const events = eventsByDate[selectedDate] || [];
    const items = events.length
      ? events.map(e => `
          <div class="cal-detail-item" data-case-id="${e.caseId}" style="--event-color:${e.event.color}">
            <span class="cal-detail-label">${e.event.label}予定</span>
            <span class="cal-detail-name">${escapeHtml(e.siteName)}</span>
          </div>`).join('')
      : '<div class="cal-detail-empty">予定はありません</div>';

    detailEl.innerHTML = `<div class="cal-detail-title">${formatDateJP(selectedDate)}</div>${items}`;
    detailEl.querySelectorAll('[data-case-id]').forEach(item => {
      item.addEventListener('click', () => {
        location.href = `case.html?id=${encodeURIComponent(item.dataset.caseId)}`;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
