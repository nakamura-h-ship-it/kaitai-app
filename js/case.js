// case.html（新規登録・詳細編集）の処理

(function () {
  const caseId = getQueryParam('id');
  const isEditMode = !!caseId;

  let currentSitePhotos = [];
  let currentAttachments = [];

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

    document.getElementById('f-sitePhotos').addEventListener('change', (e) => renderStagedFiles(e.target, 'site-photos-list', currentSitePhotos, isEditMode ? deleteSitePhoto : null));
    document.getElementById('f-attachments').addEventListener('change', (e) => renderStagedFiles(e.target, 'attachments-list', currentAttachments, isEditMode ? deleteAttachment : null));

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
      document.getElementById('f-customerName').value = c.customerName || '';
      document.getElementById('f-inquiryReceivedDate').value = c.inquiryReceivedDate || '';
      document.getElementById('f-address').value = c.address || '';
      document.getElementById('f-customerContact').value = c.customerContact || '';
      document.getElementById('f-vendorInfo').value = c.vendorInfo || '';
      document.getElementById('f-salesRepName').value = c.salesRepName || '';
      const candidates = c.siteVisitCandidates || [];
      document.getElementById('f-siteVisitCandidate1').value = candidates[0] || '';
      document.getElementById('f-siteVisitCandidate2').value = candidates[1] || '';
      document.getElementById('f-siteVisitCandidate3').value = candidates[2] || '';
      document.getElementById('f-siteVisitConfirmedDate').value = c.siteVisitConfirmedDate || '';
      if (c.siteVisitAt && !c.siteVisitConfirmedDate) {
        const hint = document.getElementById('legacy-site-visit-hint');
        hint.textContent = `（旧データ）現地立会い予定日時：${c.siteVisitAt}`;
        hint.style.display = 'block';
      }
      document.getElementById('f-startDate').value = c.startDate || '';
      document.getElementById('f-completionDate').value = c.completionDate || '';
      document.getElementById('f-budget').value = c.budget || '';
      document.getElementById('f-amount').value = c.amount || '';
      document.getElementById('f-status').value = c.status || STATUSES[0].key;
      document.getElementById('f-notes').value = c.notes || '';
      document.getElementById('f-nextActionAt').value = c.nextActionAt || '';

      currentSitePhotos = c.sitePhotos || [];
      currentAttachments = c.attachments || [];
      renderExistingFiles('site-photos-list', currentSitePhotos, deleteSitePhoto);
      renderExistingFiles('attachments-list', currentAttachments, deleteAttachment);

      showForm();
    } catch (e) {
      console.error('案件取得エラー:', e);
      showToast('データを取得できませんでした');
    }
  }

  function renderExistingFiles(listElId, files, onDelete) {
    const listEl = document.getElementById(listElId);
    listEl.innerHTML = files.map((f, i) => `
      <span class="file-chip">
        <a href="${f.url}" target="_blank" rel="noopener">${escapeHtml(f.name)}</a>
        <button type="button" class="file-chip-remove" data-index="${i}">×</button>
      </span>
    `).join('');
    listEl.querySelectorAll('.file-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => onDelete(parseInt(btn.dataset.index, 10)));
    });
  }

  function renderStagedFiles(inputEl, listElId, existingFiles, onDeleteExisting) {
    const staged = Array.from(inputEl.files || []).map(f => f.name);
    const listEl = document.getElementById(listElId);
    const existingHtml = existingFiles.map((f, i) => `
      <span class="file-chip">
        <a href="${f.url}" target="_blank" rel="noopener">${escapeHtml(f.name)}</a>
        ${onDeleteExisting ? `<button type="button" class="file-chip-remove" data-index="${i}">×</button>` : ''}
      </span>
    `).join('');
    const stagedHtml = staged.map(name => `<span class="file-chip file-chip-staged">${escapeHtml(name)}（追加予定）</span>`).join('');
    listEl.innerHTML = existingHtml + stagedHtml;
    if (onDeleteExisting) {
      listEl.querySelectorAll('.file-chip-remove').forEach(btn => {
        btn.addEventListener('click', () => onDeleteExisting(parseInt(btn.dataset.index, 10)));
      });
    }
  }

  async function deleteSitePhoto(index) {
    await deleteExistingFile(index, currentSitePhotos, 'sitePhotos', 'site-photos-list', 'f-sitePhotos');
  }

  async function deleteAttachment(index) {
    await deleteExistingFile(index, currentAttachments, 'attachments', 'attachments-list', 'f-attachments');
  }

  // Cloudinaryのunsigned upload preset経由では実ファイルの削除ができないため、
  // Firestore側の参照を外すのみ（Cloudinary上のファイル自体は残る）
  async function deleteExistingFile(index, filesArray, fieldName, listElId, inputElId) {
    const file = filesArray[index];
    if (!file) return;
    try {
      await db.collection(CASES_COLLECTION).doc(caseId).update({
        [fieldName]: firebase.firestore.FieldValue.arrayRemove(file),
      });
      filesArray.splice(index, 1);
      const onDelete = fieldName === 'sitePhotos' ? deleteSitePhoto : deleteAttachment;
      renderStagedFiles(document.getElementById(inputElId), listElId, filesArray, onDelete);
      showToast('一覧から外しました');
    } catch (e) {
      console.error('ファイル削除エラー:', e);
      showToast('削除に失敗しました');
    }
  }

  function collectFormValues() {
    return {
      siteName: document.getElementById('f-siteName').value.trim(),
      customerName: document.getElementById('f-customerName').value.trim(),
      inquiryReceivedDate: document.getElementById('f-inquiryReceivedDate').value,
      address: document.getElementById('f-address').value.trim(),
      customerContact: document.getElementById('f-customerContact').value.trim(),
      vendorInfo: document.getElementById('f-vendorInfo').value.trim(),
      salesRepName: document.getElementById('f-salesRepName').value.trim(),
      siteVisitCandidates: [
        document.getElementById('f-siteVisitCandidate1').value,
        document.getElementById('f-siteVisitCandidate2').value,
        document.getElementById('f-siteVisitCandidate3').value,
      ],
      siteVisitConfirmedDate: document.getElementById('f-siteVisitConfirmedDate').value,
      startDate: document.getElementById('f-startDate').value,
      completionDate: document.getElementById('f-completionDate').value,
      budget: document.getElementById('f-budget').value.trim(),
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
      showToast('現場名を入力してください');
      return;
    }

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;

    try {
      const newSitePhotoFiles = document.getElementById('f-sitePhotos').files;
      const newAttachmentFiles = document.getElementById('f-attachments').files;

      if (isEditMode) {
        const update = Object.assign({}, values, {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        if (newSitePhotoFiles && newSitePhotoFiles.length) {
          const uploaded = await uploadFiles(newSitePhotoFiles);
          update.sitePhotos = firebase.firestore.FieldValue.arrayUnion(...uploaded);
        }
        if (newAttachmentFiles && newAttachmentFiles.length) {
          const uploaded = await uploadFiles(newAttachmentFiles);
          update.attachments = firebase.firestore.FieldValue.arrayUnion(...uploaded);
        }
        await db.collection(CASES_COLLECTION).doc(caseId).update(update);
        showToast('保存しました ✓');
      } else {
        const docRef = db.collection(CASES_COLLECTION).doc();
        const sitePhotos = newSitePhotoFiles && newSitePhotoFiles.length ? await uploadFiles(newSitePhotoFiles) : [];
        const attachments = newAttachmentFiles && newAttachmentFiles.length ? await uploadFiles(newAttachmentFiles) : [];
        await docRef.set(Object.assign({}, values, {
          sitePhotos,
          attachments,
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
