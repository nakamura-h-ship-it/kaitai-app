// case.html（新規登録・詳細編集）の処理

(function () {
  const caseId = getQueryParam('id');
  const isEditMode = !!caseId;

  function init() {
    populateStatusOptions();
    document.getElementById('page-title').textContent = isEditMode ? '案件詳細・編集' : '新規案件登録';
    document.getElementById('delete-btn').style.display = isEditMode ? 'block' : 'none';

    document.querySelectorAll('.full-only').forEach(el => { el.style.display = isEditMode ? '' : 'none'; });
    document.querySelectorAll('.new-only').forEach(el => { el.style.display = isEditMode ? 'none' : ''; });

    document.getElementById('case-form').addEventListener('submit', onSubmit);
    document.getElementById('delete-btn').addEventListener('click', () => toggleConfirm(true));
    document.getElementById('confirm-cancel').addEventListener('click', () => toggleConfirm(false));
    document.getElementById('confirm-delete').addEventListener('click', onDelete);

    if (isEditMode) {
      loadCase();
    } else {
      document.getElementById('f-status').value = STATUSES[0].key;
      document.getElementById('f-inquiryReceivedDate').value = getTodayString();
      showForm();
    }
  }

  function populateStatusOptions() {
    const select = document.getElementById('f-status');
    select.innerHTML = STATUSES.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  }

  function showForm() {
    document.getElementById('form-loading').style.display = 'none';
    document.getElementById('case-form').style.display = 'block';
  }

  async function loadCase() {
    try {
      const doc = await db.collection(CASES_COLLECTION).doc(caseId).get();
      if (!doc.exists) {
        showToast('案件が見つかりませんでした');
        location.href = 'index.html';
        return;
      }
      const c = doc.data();
      document.getElementById('f-siteName').value = c.siteName || '';
      document.getElementById('f-inquiryReceivedDate').value = c.inquiryReceivedDate || '';
      document.getElementById('f-address').value = c.address || '';
      document.getElementById('f-customerContact').value = c.customerContact || '';
      document.getElementById('f-vendorInfo').value = c.vendorInfo || '';
      document.getElementById('f-salesRepName').value = c.salesRepName || '';
      document.getElementById('f-siteVisitAt').value = c.siteVisitAt || '';
      document.getElementById('f-startDate').value = c.startDate || '';
      document.getElementById('f-completionDate').value = c.completionDate || '';
      document.getElementById('f-amount').value = c.amount || '';
      document.getElementById('f-status').value = c.status || STATUSES[0].key;
      document.getElementById('f-notes').value = c.notes || '';
      document.getElementById('f-nextActionAt').value = c.nextActionAt || '';
      showForm();
    } catch (e) {
      console.error('案件取得エラー:', e);
      showToast('データを取得できませんでした');
    }
  }

  function collectFormValues() {
    return {
      siteName: document.getElementById('f-siteName').value.trim(),
      inquiryReceivedDate: document.getElementById('f-inquiryReceivedDate').value,
      address: document.getElementById('f-address').value.trim(),
      customerContact: document.getElementById('f-customerContact').value.trim(),
      vendorInfo: document.getElementById('f-vendorInfo').value.trim(),
      salesRepName: document.getElementById('f-salesRepName').value.trim(),
      siteVisitAt: document.getElementById('f-siteVisitAt').value.trim(),
      startDate: document.getElementById('f-startDate').value,
      completionDate: document.getElementById('f-completionDate').value,
      amount: document.getElementById('f-amount').value.trim(),
      status: document.getElementById('f-status').value,
      notes: document.getElementById('f-notes').value.trim(),
      nextActionAt: document.getElementById('f-nextActionAt').value,
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    const values = collectFormValues();
    if (!values.siteName) {
      showToast('現場名／顧客名を入力してください');
      return;
    }

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;

    try {
      if (isEditMode) {
        await db.collection(CASES_COLLECTION).doc(caseId).update(Object.assign({}, values, {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }));
        showToast('保存しました ✓');
      } else {
        await db.collection(CASES_COLLECTION).add(Object.assign({}, values, {
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }));
        showToast('案件を登録しました ✓');
      }
      location.href = 'index.html';
    } catch (e2) {
      console.error('保存エラー:', e2);
      showToast('保存に失敗しました');
      saveBtn.disabled = false;
    }
  }

  function toggleConfirm(show) {
    document.getElementById('confirm-overlay').style.display = show ? 'flex' : 'none';
  }

  async function onDelete() {
    try {
      await db.collection(CASES_COLLECTION).doc(caseId).delete();
      showToast('削除しました');
      location.href = 'index.html';
    } catch (e) {
      console.error('削除エラー:', e);
      showToast('削除に失敗しました');
      toggleConfirm(false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
