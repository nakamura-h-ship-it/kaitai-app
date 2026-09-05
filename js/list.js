// index.html（案件一覧）の処理

(function () {
  let currentStatus = STATUSES[0].key;
  let casesCache = [];

  function init() {
    renderTabs();
    loadCases();
  }

  async function loadCases() {
    const listEl = document.getElementById('case-list');
    listEl.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    try {
      const snapshot = await db.collection(CASES_COLLECTION).get();
      casesCache = [];
      snapshot.forEach(doc => casesCache.push(Object.assign({ id: doc.id }, doc.data())));
      renderTabs();
      renderList();
    } catch (e) {
      console.error('案件取得エラー:', e);
      listEl.innerHTML = '<div class="empty-state"><div class="empty-text">データを取得できませんでした</div></div>';
    }
  }

  function renderTabs() {
    const tabsEl = document.getElementById('status-tabs');
    tabsEl.innerHTML = STATUSES.map(s => {
      const count = casesCache.filter(c => c.status === s.key).length;
      return `<button class="status-tab-btn ${s.key === currentStatus ? 'active' : ''}" data-status="${s.key}">${s.label}<span class="status-tab-count">${count}</span></button>`;
    }).join('');

    tabsEl.querySelectorAll('.status-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentStatus = btn.dataset.status;
        renderTabs();
        renderList();
      });
    });
  }

  function renderList() {
    const listEl = document.getElementById('case-list');
    const cases = casesCache
      .filter(c => c.status === currentStatus)
      .sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));

    if (!cases.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">この案件はまだありません</div></div>';
      return;
    }

    listEl.innerHTML = cases.map(renderCaseCard).join('');
    listEl.querySelectorAll('[data-case-id]').forEach(card => {
      card.addEventListener('click', () => {
        location.href = `case.html?id=${encodeURIComponent(card.dataset.caseId)}`;
      });
    });
  }

  function renderCaseCard(c) {
    const status = getStatusInfo(c.status);
    const rows = [];
    if (c.customerName) rows.push(fieldRow('顧客名', escapeHtml(c.customerName)));
    if (c.address) rows.push(fieldRow('住所', escapeHtml(c.address)));
    if (c.salesRepName) rows.push(fieldRow('営業担当', escapeHtml(c.salesRepName)));
    if (c.inquiryReceivedDate) rows.push(fieldRow('受注日', formatDateJP(c.inquiryReceivedDate)));
    if (c.customerContact) rows.push(fieldRow('連絡先', escapeHtml(c.customerContact)));
    if (c.vendorInfo) rows.push(fieldRow('業者', escapeHtml(c.vendorInfo)));

    const siteVisitCandidates = (c.siteVisitCandidates || []).filter(Boolean);
    if (c.siteVisitConfirmedDate) {
      rows.push(fieldRow('現地確認確定日', formatDateJP(c.siteVisitConfirmedDate)));
    } else if (siteVisitCandidates.length) {
      rows.push(fieldRow('現地確認候補日', formatDateJP(siteVisitCandidates[0])));
    } else if (c.siteVisitAt) {
      rows.push(fieldRow('現地立会い（旧）', escapeHtml(c.siteVisitAt)));
    }

    if (c.startDate) rows.push(fieldRow('着工予定', formatDateJP(c.startDate)));
    if (c.completionDate) rows.push(fieldRow('完工予定', formatDateJP(c.completionDate)));

    const amountLabel = c.customerAmount != null
      ? `${Number(c.customerAmount).toLocaleString('ja-JP')}円`
      : (c.amount ? escapeHtml(String(c.amount)) : (c.budget ? `予算希望：${escapeHtml(String(c.budget))}` : ''));

    return `
      <div class="case-card" style="--status-color:${status.color}" data-case-id="${c.id}">
        <div class="case-card-header">
          <span class="case-card-name">${escapeHtml(c.siteName || '(名称未設定)')}</span>
          ${amountLabel ? `<span class="case-card-amount">${amountLabel}</span>` : ''}
        </div>
        <div class="case-card-body">${rows.join('') || '<div class="case-field-row"><span class="case-field-label">詳細未入力</span></div>'}</div>
      </div>`;
  }

  function fieldRow(label, value) {
    return `<div class="case-field-row"><span class="case-field-label">${label}</span><span class="case-field-value">${value}</span></div>`;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
