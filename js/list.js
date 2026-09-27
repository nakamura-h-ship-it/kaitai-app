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
      snapshot.forEach(doc => {
        const c = Object.assign({ id: doc.id }, doc.data());
        // 廃止したステータス（業者へ依頼中など）の案件は先頭タブに表示する
        c.status = getStatusInfo(c.status).key;
        casesCache.push(c);
      });
      renderTabs();
      renderList();
      renderGrossProfitSummary();
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
    listEl.querySelectorAll('[data-status-case-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        changeStatus(btn.dataset.statusCaseId, btn.dataset.status);
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

    if (c.startDate) rows.push(fieldRow('着工予定', formatDateJP(c.startDate)));
    if (c.completionDate) rows.push(fieldRow('完工予定', formatDateJP(c.completionDate)));

    const amountLabel = typeof c.grossProfit === 'number'
      ? `粗利 ${c.grossProfit.toLocaleString('ja-JP')}円`
      : '';

    const statusChips = STATUSES.map(s => {
      const active = s.key === c.status;
      return `<button type="button" class="case-status-chip ${active ? 'active' : ''}" style="--chip-color:${s.color}" data-status-case-id="${c.id}" data-status="${s.key}" ${active ? 'disabled' : ''}>${s.label}</button>`;
    }).join('');

    return `
      <div class="case-card" style="--status-color:${status.color}" data-case-id="${c.id}">
        <div class="case-card-header">
          <span class="case-card-name">${escapeHtml(c.siteName || '(名称未設定)')}</span>
          ${amountLabel ? `<span class="case-card-amount">${amountLabel}</span>` : ''}
        </div>
        <div class="case-card-body">${rows.join('') || '<div class="case-field-row"><span class="case-field-label">詳細未入力</span></div>'}</div>
        <div class="case-card-footer">${statusChips}</div>
      </div>`;
  }

  async function changeStatus(caseId, statusKey) {
    const status = getStatusInfo(statusKey);
    if (statusKey === LOST_STATUS_KEY && !confirm('この案件を「没」にしますか？')) return;
    try {
      await db.collection(CASES_COLLECTION).doc(caseId).update({
        status: status.key,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      const c = casesCache.find(x => x.id === caseId);
      if (c) c.status = status.key;
      renderTabs();
      renderList();
      renderGrossProfitSummary();
      showToast(`「${status.label}」に移動しました`);
    } catch (e) {
      console.error('更新エラー:', e);
      showToast('更新に失敗しました');
    }
  }

  function renderGrossProfitSummary() {
    const summaryEl = document.getElementById('gross-profit-summary');
    const total = casesCache
      .filter(c => c.status !== LOST_STATUS_KEY)
      .reduce((sum, c) => sum + (typeof c.grossProfit === 'number' ? c.grossProfit : 0), 0);
    summaryEl.innerHTML = `<span class="gross-profit-summary-label">粗利合計</span><span class="gross-profit-summary-value">${total.toLocaleString('ja-JP')}円</span>`;
  }

  function fieldRow(label, value) {
    return `<div class="case-field-row"><span class="case-field-label">${label}</span><span class="case-field-value">${value}</span></div>`;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
