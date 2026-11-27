/* ==========================================================
   Learning Universe LMS — Admin Portal (SPA, hash routing)
   ========================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const view = $('#view');
  const fmt = (n) => n.toLocaleString('en-IN');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => n.replace(/^(Ms|Mr|Mrs)\.\s/, '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const AV_COLORS = ['#2b78f6', '#7c4dff', '#18a957', '#f59e0b', '#ec4899', '#10b3a3', '#e23b3b'];
  const avatar = (n, big) => `<span class="avatar ${big ? '' : 'sm'}" style="background:${AV_COLORS[n.charCodeAt(0) % AV_COLORS.length]}${big ? ';width:56px;height:56px;font-size:18px' : ''}">${esc(initials(n))}</span>`;

  /* ---------- Navigation ---------- */
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', img: 'navDashboard' },
    { id: 'users', label: 'Users', icon: 'users', img: 'navUsers' },
    { id: 'academic', label: 'Academic Setup', icon: 'building', img: 'navAcademic' },
    { id: 'content', label: 'Content Library', icon: 'book', img: 'navContent' },
    { id: 'learning', label: 'Learning & Activities', icon: 'activity', img: 'navLearning' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'chart', img: 'navReports' },
    { id: 'communication', label: 'Communication', icon: 'message', img: 'cmMegaphone', badge: 2 },
    { id: 'settings', label: 'System Settings', icon: 'settings', img: 'navSettings' },
  ];
  $('#nav').innerHTML = '<div class="nav-label">Main Menu</div>' + NAV.map((n) =>
    `<a href="#/${n.id}" data-nav="${n.id}"><span class="nav-ico">${n.img ? img(n.img) : icon(n.icon)}</span><span>${n.label}</span>${n.badge ? `<span class="badge">${n.badge}</span>` : ''}</a>`).join('');
  hydrateIcons();

  const sidebar = $('#sidebar'), backdrop = $('#backdrop');
  const closeMenu = () => { sidebar.classList.remove('open'); backdrop.classList.remove('show'); };
  $('#menuBtn').onclick = () => { sidebar.classList.add('open'); backdrop.classList.add('show'); };
  backdrop.onclick = closeMenu;
  $('#bellBtn').onclick = () => go('communication');
  $('#globalSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      state.users.q = e.target.value.trim(); state.users.tab = 'students'; state.users.page = 1;
      e.target.value = ''; go('users');
    }
  });

  /* ---------- UI helpers ---------- */
  function toast(msg, err = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : '');
    t.innerHTML = icon(err ? 'alert' : 'check') + `<span>${esc(msg)}</span>`;
    $('#toastRoot').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, 2800);
  }
  const modalRoot = $('#modalRoot');
  function openModal({ title, body, foot = '', wide = false, onMount }) {
    modalRoot.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
    modalRoot.classList.add('show');
    $$('[data-close]', modalRoot).forEach((b) => (b.onclick = closeModal));
    onMount && onMount(modalRoot);
    const f = modalRoot.querySelector('input, select, textarea'); f && f.focus();
  }
  function closeModal() { modalRoot.classList.remove('show'); modalRoot.innerHTML = ''; }
  modalRoot.addEventListener('mousedown', (e) => { if (e.target === modalRoot) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu-wrap')) $$('.dropdown').forEach((d) => d.classList.remove('show')); });

  function confirmDialog(title, text, onYes) {
    openModal({
      title, body: `<p style="margin:0">${text}</p>`,
      foot: `<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="yesBtn" style="background:var(--red)">Delete</button>`,
      onMount: (r) => ($('#yesBtn', r).onclick = () => { closeModal(); onYes(); }),
    });
  }
  const go = (path) => { location.hash = '#/' + path; };
  const pageHead = (title, sub = '', back = '', right = '', crumbs = '') => `
    ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}
    <div class="page-head">
      ${back ? `<button class="back-btn" data-go="${back}" aria-label="Back">${icon('back')}</button>` : ''}
      <div class="ph-title"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
      ${right ? `<div class="ph-actions">${right}</div>` : ''}
    </div>`;
  const crumb = (items) => items.map(([l, p], i) => (p ? `<a href="#/${p}">${l}</a>` : `<span>${l}</span>`) + (i < items.length - 1 ? icon('chevRight') : '')).join('');
  const pager = (page, pages) => {
    const btn = (p, label = p) => `<button data-page="${p}" class="${p === page ? 'active' : ''}">${label}</button>`;
    let h = `<button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous">${icon('chevLeft')}</button>`;
    const set = new Set([1, 2, 3, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages));
    let prev = 0;
    [...set].sort((a, b) => a - b).forEach((p) => { if (p - prev > 1) h += '<span class="gap">…</span>'; h += btn(p); prev = p; });
    h += `<button data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next">${icon('chevRight')}</button>`;
    return h;
  };
  const statusPill = (s) => `<span class="pill ${s === 'Active' || s === 'Published' ? 'ok' : s === 'Draft' ? 'draft' : 'off'}">${s}</span>`;
  const TYPE = {
    SCORM: { ic: 'package', c: 't-blue' }, PDF: { ic: 'pdf', c: 't-red' },
    Video: { ic: 'video', c: 't-purple' }, Document: { ic: 'file', c: 't-orange' },
  };
  const typeChip = (t) => `<span class="type-chip"><span class="tb-img">${img('cl' + t, '', '')}</span>${t}</span>`;
  // Content Library status badges use the supplied badge images
  const contentStatus = (s) => `<img class="status-img" src="${IMGS[s === 'Published' ? 'clPublished' : 'clDraft']}" alt="${s}" title="${s}" />`;

  // Floating action menu (positioned on the page so table scrolling never clips it)
  function popMenu(anchor, items) {
    closePopMenu();
    const m = document.createElement('div');
    m.className = 'dropdown show pop-menu';
    m.innerHTML = items.map((it, i) => `<button data-i="${i}" class="${it.danger ? 'danger' : ''}">${icon(it.icon)}${it.label}</button>`).join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const top = r.bottom + 6 + m.offsetHeight > window.innerHeight ? r.top - m.offsetHeight - 6 : r.bottom + 6;
    m.style.top = top + 'px';
    m.style.left = Math.max(8, r.right - m.offsetWidth) + 'px';
    m.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) { closePopMenu(); items[+b.dataset.i].run(); } };
    setTimeout(() => document.addEventListener('click', closePopMenu, { once: true }));
  }
  function closePopMenu() { $$('.pop-menu').forEach((m) => m.remove()); }
  window.addEventListener('scroll', closePopMenu, true);
  window.addEventListener('hashchange', closePopMenu);
  const classOpts = (sel) => Array.from({ length: 7 }, (_, i) => `Class ${i + 6}`).map((c) => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
  const subjOpts = (sel) => DB.subjects.map((s) => `<option ${s === sel ? 'selected' : ''}>${s}</option>`).join('');

  /* ---------- State ---------- */
  const state = {
    dashRange: 'This Month',
    users: { tab: 'students', q: '', page: 1, per: 10, selected: new Set(), statusFilter: 'All' },
    content: { tab: 'All Materials', q: '' },
    comm: { tab: 'Announcements' },
    reports: { cls: 'Class 12', subject: 'Physics', range: 'This Month' },
  };

  /* ==========================================================
     1. DASHBOARD
     ========================================================== */
  function viewDashboard() {
    const s = DB.stats;
    const statCards = [
      ['statStudents', 't-blue', s.students, 'Total Students', '+4.2%', 'users'],
      ['statTeachers', 't-purple', s.teachers, 'Teachers', '+2', 'users'],
      ['statClasses', 't-green', s.classes, 'Classes', '+6', 'academic'],
      ['statMaterials', 't-orange', s.materials, 'Materials', '+38', 'content'],
      ['statAssignments', 't-pink', s.assignments, 'Assignments', '+12', 'learning'],
      ['statQuizzes', 't-teal', s.quizzes, 'Quizzes', '+9', 'learning'],
    ];
    const ranges = { 'This Week': 1, 'This Month': 1.25, 'This Year': 1.6 };
    const k = ranges[state.dashRange];
    const active = [1800, 2400, 2700, 3100, 3000, 3600, 4300].map((v) => Math.round(v * k * 0.8));
    const compl = [900, 1300, 1500, 1900, 2100, 2300, 2900].map((v) => Math.round(v * k * 0.8));
    const max = Math.ceil(Math.max(...active) / 1000) * 1000;
    const flow = [
      ['navDashboard', 'Dashboard', 'Overview', 'dashboard'],
      ['navUsers', 'Manage Users', 'Students & Teachers', 'users'],
      ['navAcademic', 'Academic Setup', 'Classes, Subjects, Syllabus', 'academic'],
      ['navContent', 'Content Library', 'PDF, Video, SCORM', 'content'],
      ['navLearning', 'Learning & Activities', 'Assignments, Quizzes, Exams', 'learning'],
      ['navReports', 'Reports & Analytics', 'Performance, Completion', 'reports'],
      ['navSettings', 'Settings', 'Roles, Integrations, Backup', 'settings'],
    ];

    return `
    <div class="welcome">
      <div><h1>Welcome, Admin! 👋</h1><p>Manage your LMS, users, content and learning activities.</p></div>
      <div class="spacer"></div>
      <select class="select sm" id="dashRange">${Object.keys(ranges).map((r) => `<option ${r === state.dashRange ? 'selected' : ''}>${r}</option>`).join('')}</select>
    </div>

    <div class="stats">
      ${statCards.map(([ic, c, n, l, d, link]) => `
        <a class="card stat" href="#/${link}">
          <div class="stat-img">${img(ic, '', l)}</div>
          <div class="num">${fmt(n)}</div><div class="lbl">${l}</div>
          <div class="delta">${d} this month</div>
        </a>`).join('')}
    </div>

    <div class="dash-grid">
      <div class="card card-pad">
        <div class="card-head"><h3>Learning Overview</h3><span class="spacer"></span><span class="muted" style="font-size:12.5px">${state.dashRange}</span></div>
        ${lineChart({
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          max, ticks: 5, format: (v) => (v ? v / 1000 + 'K' : '0'), label: 'Active students and completions per day',
          series: [
            { name: 'Active Students', color: '#2b78f6', data: active, area: true },
            { name: 'Completions', color: '#10b3a3', data: compl },
          ],
        })}
      </div>
      <div class="card card-pad">
        <div class="card-head"><h3>Quick Actions</h3></div>
        <div class="quick">
          <a href="#" data-action="addUser"><span class="qa-img">${img('addUser')}</span>Add User</a>
          <a href="#/academic/create-class"><span class="qa-img">${img('createClass')}</span>Create Class</a>
          <a href="#/content/upload"><span class="qa-img">${img('upload')}</span>Upload Material</a>
          <a href="#/reports"><span class="qa-img">${img('viewReports')}</span>View Reports</a>
        </div>
        <div class="card-head mt-20"><h3>Recent Activity</h3></div>
        <div class="recent-list">
          <div class="row"><span class="tile-ico t-blue">${icon('package')}</span><div class="meta"><strong>Electric Charges – SCORM published</strong><small>Class 12 · Physics</small></div><small class="muted">2h ago</small></div>
          <div class="row"><span class="tile-ico t-green">${icon('userPlus')}</span><div class="meta"><strong>18 students enrolled</strong><small>Class 11 – B</small></div><small class="muted">5h ago</small></div>
          <div class="row"><span class="tile-ico t-pink">${icon('clipboard')}</span><div class="meta"><strong>Unit Test schedule created</strong><small>Class 11 & 12</small></div><small class="muted">1d ago</small></div>
        </div>
      </div>
    </div>

    <div class="card card-pad">
      <div class="card-head"><h3>Admin Flow</h3><span class="spacer"></span><span class="muted" style="font-size:12.5px">Jump to any module</span></div>
      <div class="flow">
        ${flow.map(([ic, t, sub, link], i) => `
          <a class="flow-step" href="#/${link}"><span class="flow-img">${img(ic)}</span><strong>${t}</strong><small>${sub}</small></a>
          ${i < flow.length - 1 ? `<span class="flow-arrow">${icon('arrowRight')}</span>` : ''}`).join('')}
      </div>
    </div>`;
  }
  function bindDashboard() {
    $('#dashRange').onchange = (e) => { state.dashRange = e.target.value; render(); };
    $('[data-action="addUser"]').onclick = (e) => { e.preventDefault(); userModal('students'); };
  }

  /* ==========================================================
     2. USER MANAGEMENT
     ========================================================== */
  const USER_TABS = {
    students: { label: 'Students', add: 'Add Student', data: () => DB.students,
      cols: ['Student Name', 'Class', 'Section', 'Email', 'Status'],
      row: (u) => `<td class="name"><div class="cell-user">${avatar(u.name)}${esc(u.name)}</div></td><td>Class ${u.cls}</td><td>${u.section}</td><td>${esc(u.email)}</td>` },
    teachers: { label: 'Teachers', add: 'Add Teacher', data: () => DB.teachers,
      cols: ['Teacher Name', 'Subject', 'Classes', 'Email', 'Status'],
      row: (u) => `<td class="name"><div class="cell-user">${avatar(u.name)}${esc(u.name)}</div></td><td>${u.subject}</td><td>${u.classes}</td><td>${esc(u.email)}</td>` },
    admins: { label: 'Admins', add: 'Add Admin', data: () => DB.admins,
      cols: ['Admin Name', 'Role', 'ID', 'Email', 'Status'],
      row: (u) => `<td class="name"><div class="cell-user">${avatar(u.name)}${esc(u.name)}</div></td><td>${u.role}</td><td>${u.id}</td><td>${esc(u.email)}</td>` },
  };
  function filteredUsers() {
    const st = state.users, q = st.q.toLowerCase();
    return USER_TABS[st.tab].data().filter((u) =>
      (st.statusFilter === 'All' || u.status === st.statusFilter) &&
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)));
  }
  function viewUsers() {
    const st = state.users, T = USER_TABS[st.tab];
    return `
    ${pageHead('Users', 'Manage students, teachers and administrators.', 'dashboard')}
    <div class="card">
      <div class="toolbar">
        <div class="tabs" role="tablist">${Object.entries(USER_TABS).map(([k, t]) =>
          `<button role="tab" data-tab="${k}" class="${k === st.tab ? 'active' : ''}">${t.label}</button>`).join('')}</div>
        <span class="spacer"></span>
        <select class="select sm" id="statusFilter">${['All', 'Active', 'Inactive'].map((s) => `<option ${s === st.statusFilter ? 'selected' : ''} value="${s}">${s === 'All' ? 'All Status' : s}</option>`).join('')}</select>
        <label class="search-box">${icon('search')}<input id="userSearch" type="search" placeholder="Search by name, email or ID…" value="${esc(st.q)}" /></label>
        <button class="btn btn-primary" id="addUserBtn">${icon('plus')}${T.add}</button>
      </div>
      <div class="bulk-bar" id="bulkBar"><span id="bulkCount"></span><span class="spacer" style="flex:1"></span>
        <button class="btn btn-outline" id="bulkActivate">Mark Active</button>
        <button class="btn btn-outline" id="bulkDeactivate">Mark Inactive</button>
        <button class="btn btn-outline" id="bulkDelete" style="color:var(--red)">${icon('trash')}Delete</button></div>
      <div class="table-wrap"><table class="tbl stack">
        <thead><tr><th style="width:40px"><input type="checkbox" id="checkAll" aria-label="Select all" /></th>
          ${T.cols.map((c) => `<th>${c}</th>`).join('')}<th>Actions</th></tr></thead>
        <tbody id="userRows"></tbody>
      </table></div>
      <div class="table-foot"><span id="showing"></span><div class="pager" id="pager"></div></div>
    </div>`;
  }
  function renderUserRows() {
    const st = state.users, T = USER_TABS[st.tab];
    const list = filteredUsers();
    const pages = Math.max(1, Math.ceil(list.length / st.per));
    st.page = Math.min(st.page, pages);
    const start = (st.page - 1) * st.per, rows = list.slice(start, start + st.per);
    $('#userRows').innerHTML = rows.length ? rows.map((u) => `
      <tr class="${st.selected.has(u.id) ? 'selected' : ''}">
        <td><input type="checkbox" data-sel="${u.id}" ${st.selected.has(u.id) ? 'checked' : ''} aria-label="Select ${esc(u.name)}" /></td>
        ${T.row(u)}<td>${statusPill(u.status)}</td>
        <td><div class="actions">
          <button class="act" data-view="${u.id}" title="View">${icon('eye')}</button>
          <button class="act" data-edit="${u.id}" title="Edit">${icon('edit')}</button>
          <button class="act del" data-del="${u.id}" title="Delete">${icon('trash')}</button>
        </div></td>
      </tr>`).join('') : `<tr><td colspan="8" class="empty">No ${T.label.toLowerCase()} match your search.</td></tr>`;
    $('#showing').textContent = list.length ? `Showing ${fmt(start + 1)} – ${fmt(start + rows.length)} of ${fmt(list.length)}` : 'No results';
    $('#pager').innerHTML = pager(st.page, pages);
    $('#checkAll').checked = rows.length > 0 && rows.every((u) => st.selected.has(u.id));
    const n = st.selected.size;
    $('#bulkBar').classList.toggle('show', n > 0);
    $('#bulkCount').textContent = `${n} selected`;
  }
  function bindUsers() {
    const st = state.users;
    renderUserRows();
    $$('[data-tab]').forEach((b) => (b.onclick = () => { st.tab = b.dataset.tab; st.page = 1; st.selected.clear(); render(); }));
    $('#statusFilter').onchange = (e) => { st.statusFilter = e.target.value; st.page = 1; renderUserRows(); };
    $('#userSearch').oninput = (e) => { st.q = e.target.value; st.page = 1; renderUserRows(); };
    $('#addUserBtn').onclick = () => userModal(st.tab);
    $('#pager').onclick = (e) => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { st.page = +b.dataset.page; renderUserRows(); } };
    $('#checkAll').onchange = (e) => {
      $$('[data-sel]').forEach((c) => (e.target.checked ? st.selected.add(c.dataset.sel) : st.selected.delete(c.dataset.sel)));
      renderUserRows();
    };
    const list = () => USER_TABS[st.tab].data();
    const find = (id) => list().find((u) => u.id === id);
    $('#userRows').onclick = (e) => {
      const t = e.target.closest('button, input'); if (!t) return;
      if (t.dataset.sel) { t.checked ? st.selected.add(t.dataset.sel) : st.selected.delete(t.dataset.sel); renderUserRows(); }
      else if (t.dataset.view) viewUserModal(find(t.dataset.view));
      else if (t.dataset.edit) userModal(st.tab, find(t.dataset.edit));
      else if (t.dataset.del) {
        const u = find(t.dataset.del);
        confirmDialog('Delete user', `Are you sure you want to delete <strong>${esc(u.name)}</strong>? This cannot be undone.`, () => {
          const arr = list(); arr.splice(arr.indexOf(u), 1); st.selected.delete(u.id);
          renderUserRows(); toast(`${u.name} deleted`);
        });
      }
    };
    const bulkStatus = (s) => { list().forEach((u) => st.selected.has(u.id) && (u.status = s)); toast(`${st.selected.size} users marked ${s}`); st.selected.clear(); renderUserRows(); };
    $('#bulkActivate').onclick = () => bulkStatus('Active');
    $('#bulkDeactivate').onclick = () => bulkStatus('Inactive');
    $('#bulkDelete').onclick = () => confirmDialog('Delete selected users', `Delete <strong>${st.selected.size}</strong> selected users?`, () => {
      const arr = list(); const n = st.selected.size;
      for (let i = arr.length - 1; i >= 0; i--) if (st.selected.has(arr[i].id)) arr.splice(i, 1);
      st.selected.clear(); renderUserRows(); toast(`${n} users deleted`);
    });
  }
  function viewUserModal(u) {
    const rows = Object.entries(u).filter(([k]) => k !== 'name').map(([k, v]) =>
      `<div class="toggle-row"><div class="meta"><small>${k === 'cls' ? 'Class' : k[0].toUpperCase() + k.slice(1)}</small><strong>${k === 'status' ? statusPill(v) : esc(k === 'cls' ? 'Class ' + v : v)}</strong></div></div>`).join('');
    openModal({ title: u.name, body: `<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">${avatar(u.name, true)}<div><h3>${esc(u.name)}</h3><small class="muted">${u.id}</small></div></div>${rows}`,
      foot: '<button class="btn btn-outline" data-close>Close</button>' });
  }
  function userModal(tab, u) {
    const isEdit = !!u, T = USER_TABS[tab];
    let fields = `
      <div class="field"><label>Full Name <span class="req">*</span></label><input class="input" name="name" required value="${esc(u?.name || '')}" /></div>
      <div class="field"><label>Email <span class="req">*</span></label><input class="input" type="email" name="email" required value="${esc(u?.email || '')}" /></div>`;
    if (tab === 'students') fields += `
      <div class="field"><label>Class <span class="req">*</span></label><select class="select" name="cls">${classOpts(u ? 'Class ' + u.cls : 'Class 12')}</select></div>
      <div class="field"><label>Section <span class="req">*</span></label><select class="select" name="section">${DB.sections.map((s) => `<option ${u?.section === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>`;
    if (tab === 'teachers') fields += `
      <div class="field"><label>Subject</label><select class="select" name="subject">${subjOpts(u?.subject)}</select></div>
      <div class="field"><label>Classes</label><input class="input" name="classes" placeholder="e.g. Class 11, 12" value="${esc(u?.classes || '')}" /></div>`;
    if (tab === 'admins') fields += `
      <div class="field full"><label>Role</label><select class="select" name="role">${['Super Administrator', 'Academic Coordinator', 'Content Manager', 'Exam Controller'].map((r) => `<option ${u?.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`;
    fields += `<div class="field full"><label>Status</label><select class="select" name="status">${['Active', 'Inactive'].map((s) => `<option ${u?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>`;
    openModal({
      title: isEdit ? `Edit ${u.name}` : T.add,
      body: `<form id="userForm" class="form-grid" novalidate>${fields}</form>`,
      foot: `<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" form="userForm" type="submit">${icon('check')}${isEdit ? 'Save Changes' : T.add}</button>`,
      onMount: (r) => {
        $('#userForm', r).onsubmit = (e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.target));
          if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email)) { toast('Please enter a valid name and email', true); return; }
          if (d.cls) d.cls = +d.cls.replace('Class ', '');
          if (isEdit) Object.assign(u, d);
          else {
            const arr = T.data(), prefix = { students: 'STU', teachers: 'TCH', admins: 'ADM' }[tab];
            arr.unshift({ id: prefix + (Date.now() % 100000), ...d });
          }
          closeModal();
          toast(isEdit ? 'Changes saved' : `${d.name} added`);
          if (currentRoute() === 'users') { state.users.tab = tab; render(); }
        };
      },
    });
  }

  /* ==========================================================
     3. ACADEMIC SETUP
     ========================================================== */
  const ACADEMIC = [
    { key: 'year', ic: 'calendar', img: 'acYear', c: 't-purple', t: 'Academic Year', s: `(${DB.academicYear})` },
    { key: 'classes', ic: 'layers', img: 'acClasses', c: 't-blue', t: 'Classes', s: '(Class 6 – 12)', count: () => DB.classes.length },
    { key: 'subjects', ic: 'book', img: 'acSubjects', c: 't-orange', t: 'Subjects', s: '(Physics, Chemistry…)', count: () => DB.subjects.length },
    { key: 'sections', ic: 'sitemap', img: 'acSections', c: 't-blue', t: 'Sections', s: '(A, B, C…)', count: () => DB.sections.length },
    { key: 'syllabus', ic: 'syllabus', img: 'acSyllabus', c: 't-blue', t: 'Syllabus', s: '(Chapter & Units)' },
  ];
  function viewAcademic() {
    return `${pageHead('Academic Setup', 'Configure academic year, classes, subjects, sections and syllabus.', 'dashboard',
      `<a class="btn btn-primary" href="#/academic/create-class">${icon('plus')}Create Class</a>`)}
    <div class="feature-grid">${ACADEMIC.map((a) => `
      <div class="card feature" data-ac="${a.key}" tabindex="0" role="button">
        ${a.count ? `<span class="count">${a.count()}</span>` : ''}
        ${a.img ? `<div class="feature-img">${img(a.img, '', a.t)}</div>` : `<div class="tile-ico ${a.c}">${icon(a.ic)}</div>`}<h3>${a.t}</h3><p>${a.s}</p>
      </div>`).join('')}</div>`;
  }
  function bindAcademic() {
    $$('[data-ac]').forEach((el) => {
      const open = () => {
        const k = el.dataset.ac;
        if (k === 'classes') return go('academic/classes');
        academicModal(k);
      };
      el.onclick = open; el.onkeydown = (e) => e.key === 'Enter' && open();
    });
  }
  function academicModal(k) {
    const list = (items, adder) => `<div class="recent-list">${items.map((i) => `<div class="row">${i}</div>`).join('')}</div>${adder || ''}`;
    if (k === 'year') {
      openModal({ title: 'Academic Year', body: `<div class="form-grid">
        <div class="field full"><label>Current Academic Year</label><select class="select" id="ay">${['2025 – 2026', '2026 – 2027', '2027 – 2028'].map((y) => `<option ${y === DB.academicYear ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label>Start Date</label><input class="input" type="date" value="2026-06-01" /></div>
        <div class="field"><label>End Date</label><input class="input" type="date" value="2027-04-30" /></div></div>`,
        foot: `<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="saveAy">Save</button>`,
        onMount: (r) => ($('#saveAy', r).onclick = () => { DB.academicYear = $('#ay', r).value; ACADEMIC[0].s = `(${DB.academicYear})`; closeModal(); render(); toast('Academic year updated'); }) });
    } else if (k === 'subjects' || k === 'sections') {
      const arr = k === 'subjects' ? DB.subjects : DB.sections;
      const title = k === 'subjects' ? 'Subjects' : 'Sections';
      const draw = (r) => {
        $('.modal-body', r).innerHTML = list(arr.map((s, i) => `<span class="tile-ico t-blue" style="width:34px;height:34px">${icon(k === 'subjects' ? 'book' : 'sitemap')}</span><div class="meta"><strong>${esc(s)}</strong></div><button class="act btn-ghost icon-btn" data-rm="${i}" title="Remove">${icon('trash')}</button>`),
          `<form id="addItem" style="display:flex;gap:10px;margin-top:14px"><input class="input" name="v" placeholder="Add ${title.toLowerCase().slice(0, -1)}…" required /><button class="btn btn-primary">${icon('plus')}Add</button></form>`);
        $$('[data-rm]', r).forEach((b) => (b.onclick = () => { arr.splice(+b.dataset.rm, 1); draw(r); render(); }));
        $('#addItem', r).onsubmit = (e) => { e.preventDefault(); const v = e.target.v.value.trim(); if (v) { arr.push(v); draw(r); render(); toast(`${v} added`); $('#addItem input', r).focus(); } };
      };
      openModal({ title, body: '', foot: '<button class="btn btn-primary" data-close>Done</button>', onMount: draw });
    } else if (k === 'syllabus') {
      const units = ['Electric Charges & Fields', 'Electrostatic Potential', 'Current Electricity', 'Moving Charges & Magnetism', 'Electromagnetic Induction'];
      openModal({ title: 'Syllabus — Class 12 Physics', body: `<div style="display:flex;gap:10px;margin-bottom:12px"><select class="select">${classOpts('Class 12')}</select><select class="select">${subjOpts('Physics')}</select></div>` +
        list(units.map((u, i) => `<span class="tile-ico t-blue" style="width:34px;height:34px;font-weight:800">${i + 1}</span><div class="meta"><strong>Unit ${i + 1}: ${u}</strong><small>${3 + (i % 3)} chapters · ${8 + i * 2} materials</small></div>${statusPill(i < 3 ? 'Published' : 'Draft')}`)),
        foot: '<button class="btn btn-outline" data-close>Close</button><button class="btn btn-primary" data-close>Save Syllabus</button>', wide: true });
    }
  }

  function viewClasses() {
    return `<div class="crumbs">${crumb([['Academic Setup', 'academic'], ['Classes']])}</div>
    ${pageHead('Classes', `${DB.classes.length} classes configured for ${DB.academicYear}.`, 'academic',
      `<a class="btn btn-primary" href="#/academic/create-class">${icon('plus')}Create Class</a>`)}
    <div class="card"><div class="table-wrap"><table class="tbl stack">
      <thead><tr><th>Class</th><th>Section</th><th>Class Teacher</th><th>Subjects</th><th>Students</th><th>Actions</th></tr></thead>
      <tbody>${DB.classes.map((c, i) => `<tr>
        <td class="name">${c.name}</td><td>${c.section}</td><td>${esc(c.teacher)}</td>
        <td>${c.subjects.slice(0, 3).map((s) => `<span class="chip" style="margin-right:4px;padding:3px 9px">${s}</span>`).join('')}${c.subjects.length > 3 ? `<span class="muted">+${c.subjects.length - 3}</span>` : ''}</td>
        <td>${c.students}</td>
        <td><div class="actions"><button class="act del" data-delclass="${i}" title="Delete">${icon('trash')}</button></div></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  function bindClasses() {
    $$('[data-delclass]').forEach((b) => (b.onclick = () => {
      const c = DB.classes[+b.dataset.delclass];
      confirmDialog('Delete class', `Delete <strong>${c.name} – ${c.section}</strong>?`, () => { DB.classes.splice(+b.dataset.delclass, 1); render(); toast('Class deleted'); });
    }));
  }

  /* 4. Create / Manage Class */
  function viewCreateClass() {
    return `<div class="crumbs">${crumb([['Academic Setup', 'academic'], ['Classes', 'academic/classes'], ['Create Class']])}</div>
    ${pageHead('Create Class', 'Set up a new class with its section, class teacher and subjects.', 'academic/classes')}
    <div class="split">
      <form class="card card-pad" id="classForm" novalidate>
        <div class="form-grid">
          <div class="field"><label>Class Name <span class="req">*</span></label><select class="select" name="cls">${classOpts('Class 12')}</select></div>
          <div class="field"><label>Section <span class="req">*</span></label><select class="select" name="section">${DB.sections.map((s) => `<option>${s}</option>`).join('')}</select></div>
          <div class="field full"><label>Class Teacher</label><select class="select" name="teacher">${DB.teacherNames.map((t) => `<option>${t}</option>`).join('')}</select></div>
          <div class="field full"><label>Subjects</label>
            <div class="chips-input" id="chips"></div>
            <span class="hint">Pick subjects from the dropdown; click × to remove.</span></div>
          <div class="field"><label>Room No.</label><input class="input" name="room" placeholder="e.g. B-204" /></div>
          <div class="field"><label>Max Students</label><input class="input" type="number" name="max" value="40" min="1" /></div>
        </div>
        <div class="form-actions">
          <a class="btn btn-outline" href="#/academic/classes">Cancel</a>
          <button class="btn btn-primary" type="submit">${icon('check')}Create Class</button>
        </div>
      </form>
      <div class="card card-pad preview-card">
        <small class="muted">PREVIEW</small>
        <h3 id="pvTitle" style="margin:6px 0 14px"></h3>
        <div class="kv"><span class="muted">Class Teacher</span><strong id="pvTeacher"></strong></div>
        <div class="kv"><span class="muted">Room</span><strong id="pvRoom"></strong></div>
        <div class="kv"><span class="muted">Capacity</span><strong id="pvMax"></strong></div>
        <div style="margin-top:14px" class="muted">Subjects</div>
        <div id="pvSubjects" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
      </div>
    </div>`;
  }
  function bindCreateClass() {
    const form = $('#classForm');
    let subjects = ['Physics', 'Chemistry', 'Mathematics'];
    const drawChips = () => {
      const remaining = DB.subjects.filter((s) => !subjects.includes(s));
      $('#chips').innerHTML = subjects.map((s) => `<span class="chip">${s}<button type="button" data-rm="${s}" aria-label="Remove ${s}">${icon('x')}</button></span>`).join('') +
        (remaining.length ? `<select id="addSubj" aria-label="Add subject"><option value="">+ Add subject</option>${remaining.map((s) => `<option>${s}</option>`).join('')}</select>` : '');
      $$('[data-rm]', $('#chips')).forEach((b) => (b.onclick = () => { subjects = subjects.filter((x) => x !== b.dataset.rm); drawChips(); }));
      const sel = $('#addSubj'); if (sel) sel.onchange = () => { if (sel.value) { subjects.push(sel.value); drawChips(); } };
      preview();
    };
    const preview = () => {
      const d = Object.fromEntries(new FormData(form));
      $('#pvTitle').textContent = `${d.cls} – ${d.section}`;
      $('#pvTeacher').textContent = d.teacher;
      $('#pvRoom').textContent = d.room || '—';
      $('#pvMax').textContent = (d.max || 0) + ' students';
      $('#pvSubjects').innerHTML = subjects.length ? subjects.map((s) => `<span class="chip">${s}</span>`).join('') : '<span class="muted">None selected</span>';
    };
    form.oninput = preview;
    drawChips();
    form.onsubmit = (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (!subjects.length) return toast('Add at least one subject', true);
      if (DB.classes.some((c) => c.name === d.cls && c.section === d.section)) return toast(`${d.cls} – ${d.section} already exists`, true);
      DB.classes.push({ name: d.cls, section: d.section, teacher: d.teacher, subjects: [...subjects], students: 0 });
      toast(`${d.cls} – ${d.section} created`);
      go('academic/classes');
    };
  }

  /* ==========================================================
     5. CONTENT LIBRARY
     ========================================================== */
  const CONTENT_TABS = ['All Materials', 'Video', 'PDF', 'Document', 'SCORM'];
  function viewContent() {
    const st = state.content;
    return `${pageHead('Content Library', 'Upload and manage videos, PDFs, documents and SCORM packages.', 'dashboard',
      `<a class="btn btn-primary" href="#/content/upload">${icon('plus')}Upload Material</a>
       <button class="btn btn-outline" id="bulkUpload">${icon('upload')}Bulk Upload</button>`)}
    <div class="card">
      <div class="toolbar" style="padding-bottom:0;border:0">
        <div class="line-tabs" style="flex:1">${CONTENT_TABS.map((t) => {
          const n = t === 'All Materials' ? DB.materials.length : DB.materials.filter((m) => m.type === t).length;
          return `<button data-ctab="${t}" class="${t === st.tab ? 'active' : ''}">${t}<span class="count">${n}</span></button>`;
        }).join('')}</div>
        <label class="search-box">${icon('search')}<input id="contentSearch" type="search" placeholder="Search materials…" value="${esc(st.q)}" /></label>
      </div>
      <div class="table-wrap"><table class="tbl stack content-tbl">
        <thead><tr><th style="width:40px"><input type="checkbox" class="img-check" aria-label="Select all" id="cAll" /></th><th>Title</th><th>Type</th><th>Class</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="contentRows"></tbody></table></div>
    </div>`;
  }
  function renderContentRows() {
    const st = state.content, q = st.q.toLowerCase();
    const rows = DB.materials.filter((m) => (st.tab === 'All Materials' || m.type === st.tab) && (!q || (m.title + m.subject + m.cls).toLowerCase().includes(q)));
    $('#contentRows').innerHTML = rows.length ? rows.map((m) => {
      const i = DB.materials.indexOf(m);
      return `<tr><td><input type="checkbox" class="img-check" aria-label="Select ${esc(m.title)}" /></td>
        <td class="name">${esc(m.title)}</td><td>${typeChip(m.type)}</td><td>${m.cls}</td><td>${m.subject}</td><td>${contentStatus(m.status)}</td>
        <td><div class="actions">
          <button class="act img-act" data-mview="${i}" title="Preview" aria-label="Preview">${img('clView')}</button>
          <button class="act img-act" data-medit="${i}" title="Edit" aria-label="Edit">${img('clEdit')}</button>
          <button class="act img-act" data-mmore="${i}" title="More actions" aria-label="More actions">${img('clMore')}</button></div></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty">No materials found.</td></tr>';
  }
  function bindContent() {
    const st = state.content;
    renderContentRows();
    $$('[data-ctab]').forEach((b) => (b.onclick = () => { st.tab = b.dataset.ctab; render(); }));
    $('#contentSearch').oninput = (e) => { st.q = e.target.value; renderContentRows(); };
    $('#cAll').onchange = (e) => $$('#contentRows input[type=checkbox]').forEach((c) => (c.checked = e.target.checked));
    $('#bulkUpload').onclick = () => openModal({
      title: 'Bulk Upload', body: `<label class="dropzone" style="display:block"><input type="file" multiple hidden id="bulkFiles" />
        <div class="tile-ico t-blue">${icon('cloudUp')}</div><strong>Drop files here or click to browse</strong><small>PDF, MP4, DOCX, ZIP (SCORM) · up to 500 MB each</small></label><div id="bulkList"></div>`,
      foot: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="bulkGo" disabled>Upload</button>',
      onMount: (r) => {
        let files = [];
        $('#bulkFiles', r).onchange = (e) => {
          files = [...e.target.files];
          $('#bulkList', r).innerHTML = files.map((f) => `<div class="file-row">${icon('file')}<div class="meta"><strong>${esc(f.name)}</strong><small>${(f.size / 1048576).toFixed(1)} MB</small></div></div>`).join('');
          $('#bulkGo', r).disabled = !files.length;
        };
        $('#bulkGo', r).onclick = () => {
          files.forEach((f) => {
            const ext = f.name.split('.').pop().toLowerCase();
            const type = ext === 'pdf' ? 'PDF' : ['mp4', 'mov', 'webm'].includes(ext) ? 'Video' : ext === 'zip' ? 'SCORM' : 'Document';
            DB.materials.unshift({ title: f.name.replace(/\.[^.]+$/, ''), type, cls: 'Class 12', subject: 'Physics', status: 'Draft' });
          });
          closeModal(); render(); toast(`${files.length} file(s) uploaded as Draft`);
        };
      },
    });
    $('#contentRows').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mview) {
        const m = DB.materials[+b.dataset.mview];
        openModal({ title: m.title, body: `<div style="display:flex;gap:14px;align-items:center;margin-bottom:10px">${typeChip(m.type)}${contentStatus(m.status)}</div>
          <div class="toggle-row"><div class="meta"><small>Class</small><strong>${m.cls}</strong></div></div>
          <div class="toggle-row"><div class="meta"><small>Subject</small><strong>${m.subject}</strong></div></div>
          <div class="toggle-row"><div class="meta"><small>Views</small><strong>${fmt(120 + m.title.length * 23)}</strong></div></div>`,
          foot: '<button class="btn btn-outline" data-close>Close</button>' });
      } else if (b.dataset.medit) {
        materialModal(DB.materials[+b.dataset.medit]);
      } else if (b.dataset.mmore) {
        e.stopPropagation();
        const i = +b.dataset.mmore, m = DB.materials[i];
        const pub = m.status === 'Published';
        popMenu(b, [
          { icon: pub ? 'archive' : 'check', label: pub ? 'Unpublish (Draft)' : 'Publish', run: () => { m.status = pub ? 'Draft' : 'Published'; renderContentRows(); toast(`${m.title} → ${m.status}`); } },
          { icon: 'trash', label: 'Delete', danger: true, run: () => confirmDialog('Delete material', `Delete <strong>${esc(m.title)}</strong>?`, () => { DB.materials.splice(i, 1); render(); toast('Material deleted'); }) },
        ]);
      }
    };
  }
  function materialModal(m) {
    openModal({
      title: 'Edit Material',
      body: `<form id="matForm" class="form-grid">
        <div class="field full"><label>Title <span class="req">*</span></label><input class="input" name="title" required value="${esc(m.title)}" /></div>
        <div class="field"><label>Type</label><select class="select" name="type">${Object.keys(TYPE).map((t) => `<option ${t === m.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select class="select" name="status">${['Published', 'Draft'].map((s) => `<option ${s === m.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>Class</label><select class="select" name="cls">${classOpts(m.cls)}</select></div>
        <div class="field"><label>Subject</label><select class="select" name="subject">${subjOpts(m.subject)}</select></div></form>`,
      foot: `<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" form="matForm" type="submit">${icon('check')}Save Changes</button>`,
      onMount: (r) => ($('#matForm', r).onsubmit = (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        if (!d.title.trim()) return toast('Title is required', true);
        Object.assign(m, d, { title: d.title.trim() });
        closeModal(); render(); toast('Material updated');
      }),
    });
  }

  /* 6. Upload Material / SCORM */
  function viewUpload() {
    return `<div class="crumbs">${crumb([['Content Library', 'content'], ['Upload Material']])}</div>
    ${pageHead('Upload SCORM Package', 'Upload interactive SCORM modules or other learning materials.', 'content')}
    <form class="split" id="uploadForm" novalidate>
      <div class="card card-pad">
        <div class="form-grid">
          <div class="field full"><label>Title <span class="req">*</span></label><input class="input" name="title" value="Electric Charges – Interactive Module" required /></div>
          <div class="field"><label>Class <span class="req">*</span></label><select class="select" name="cls">${classOpts('Class 12')}</select></div>
          <div class="field"><label>Subject <span class="req">*</span></label><select class="select" name="subject">${subjOpts('Physics')}</select></div>
          <div class="field full"><label>Material Type <span class="req">*</span></label>
            <select class="select" name="type" id="mType"><option value="SCORM">SCORM (ZIP)</option><option value="PDF">PDF</option><option value="Video">Video</option><option value="Document">Document</option></select></div>
          <div class="field full"><label>File <span class="req">*</span></label>
            <label class="dropzone" id="drop"><input type="file" id="fileIn" hidden accept=".zip" />
              <div class="tile-ico t-blue">${icon('cloudUp')}</div><strong>Drag & drop your file or click to browse</strong><small id="acceptHint">SCORM 1.2 / 2004 package (.zip) · max 500 MB</small></label>
            <div id="fileBox"></div></div>
          <div class="field full"><label>Description</label><textarea class="textarea" name="desc" placeholder="What will students learn?"></textarea></div>
        </div>
      </div>
      <div class="card card-pad">
        <div class="card-head"><h3>Visibility</h3></div>
        <div class="radio-list" id="vis">
          <label class="radio checked"><input type="radio" name="vis" value="Published" checked /><span><strong>Publish Now</strong><small>Visible to assigned students</small></span></label>
          <label class="radio"><input type="radio" name="vis" value="Draft" /><span><strong>Save as Draft</strong><small>Not visible to students</small></span></label>
          <label class="radio"><input type="radio" name="vis" value="Scheduled" /><span><strong>Schedule Publish</strong><small>Pick a date & time</small></span></label>
        </div>
        <div class="schedule-box" id="schedBox"><div class="field"><label>Publish on</label><input class="input" type="datetime-local" name="when" value="2026-11-28T10:00" /></div></div>
        <div class="card-head mt-20"><h3>Tracking</h3></div>
        <div class="toggle-row"><div class="meta"><strong>Track completion</strong><small>Record SCORM completion status</small></div><label class="switch"><input type="checkbox" checked /><span></span></label></div>
        <div class="toggle-row"><div class="meta"><strong>Track score</strong><small>Sync score to gradebook</small></div><label class="switch"><input type="checkbox" checked /><span></span></label></div>
        <div class="form-actions">
          <a class="btn btn-outline" href="#/content">Cancel</a>
          <button class="btn btn-primary" type="submit" id="uploadBtn">${icon('upload')}Upload</button>
        </div>
      </div>
    </form>`;
  }
  function bindUpload() {
    let file = null;
    const accept = { SCORM: ['.zip', 'SCORM 1.2 / 2004 package (.zip) · max 500 MB'], PDF: ['.pdf', 'PDF document · max 50 MB'], Video: ['video/*', 'MP4, MOV, WEBM · max 2 GB'], Document: ['.doc,.docx,.ppt,.pptx', 'Word or PowerPoint · max 50 MB'] };
    const fileIn = $('#fileIn'), drop = $('#drop');
    $('#mType').onchange = (e) => {
      const [a, h] = accept[e.target.value]; fileIn.accept = a; $('#acceptHint').textContent = h;
      $('.page-head h1').textContent = e.target.value === 'SCORM' ? 'Upload SCORM Package' : `Upload ${e.target.value}`;
    };
    const setFile = (f) => {
      file = f;
      $('#fileBox').innerHTML = `<div class="file-row"><span class="tile-ico t-blue" style="width:38px;height:38px">${icon('package')}</span>
        <div class="meta"><strong>${esc(f.name)}</strong><small>${(f.size / 1048576).toFixed(1)} MB</small><div class="progress"><i id="prog" style="width:0"></i></div></div>
        <span id="fileOk"></span><button type="button" class="icon-btn" id="rmFile" aria-label="Remove file">${icon('x')}</button></div>`;
      let p = 0; const t = setInterval(() => { p = Math.min(100, p + 12); const el = $('#prog'); if (!el) return clearInterval(t); el.style.width = p + '%'; if (p === 100) { clearInterval(t); $('#fileOk').innerHTML = icon('check', 'ok-ico'); } }, 80);
      $('#rmFile').onclick = () => { file = null; fileIn.value = ''; $('#fileBox').innerHTML = ''; };
    };
    fileIn.onchange = () => fileIn.files[0] && setFile(fileIn.files[0]);
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', (e) => e.dataTransfer.files[0] && setFile(e.dataTransfer.files[0]));
    $('#vis').onchange = () => {
      $$('#vis .radio').forEach((r) => r.classList.toggle('checked', r.querySelector('input').checked));
      $('#schedBox').classList.toggle('show', $('#vis input:checked').value === 'Scheduled');
    };
    $('#uploadForm').onsubmit = (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      if (!d.title.trim()) return toast('Title is required', true);
      if (!file) return toast('Please choose a file to upload', true);
      DB.materials.unshift({ title: d.title.trim(), type: d.type, cls: d.cls, subject: d.subject, status: d.vis === 'Published' ? 'Published' : 'Draft' });
      toast(d.vis === 'Scheduled' ? `Scheduled for ${d.when.replace('T', ' ')}` : `${d.title} uploaded`);
      state.content.tab = 'All Materials'; go('content');
    };
  }

  /* ==========================================================
     7. LEARNING & ACTIVITIES
     ========================================================== */
  const LEARNING = [
    { img: 'laAssignments', t: 'Assignments', s: 'Create & manage homework', n: 308 },
    { img: 'laQuizzes', t: 'Quizzes / Tests', s: 'Create exams & question banks', n: 156 },
    { img: 'laAssessments', t: 'Assessments', s: 'Unit, Mid-term, Final exams', n: 42 },
    { img: 'laQuestionBank', t: 'Question Bank', s: 'Manage reusable questions', n: 3820 },
    { img: 'laExamSettings', t: 'Exam Settings', s: 'Marking, time, rules' },
    { img: 'laGrading', t: 'Grading & Feedback', s: 'Evaluate & share results', n: 64 },
  ];
  function viewLearning() {
    return `${pageHead('Learning & Activities', 'Assignments, quizzes, assessments and grading in one place.', 'dashboard',
      `<button class="btn btn-primary" id="newActivity">${icon('plus')}New Activity</button>`)}
    <div class="feature-grid">${LEARNING.map((l, i) => `
      <div class="card feature" data-learn="${i}" tabindex="0" role="button">
        ${l.n ? `<span class="count">${fmt(l.n)}</span>` : ''}
        <div class="feature-img">${img(l.img, '', l.t)}</div><h3>${l.t}</h3><p>${l.s}</p></div>`).join('')}</div>
    <div class="card mt-20">
      <div class="toolbar"><h3 style="font-size:16px">Upcoming Activities</h3></div>
      <div class="table-wrap"><table class="tbl stack"><thead><tr><th>Activity</th><th>Type</th><th>Class</th><th>Due</th><th>Submissions</th><th>Status</th></tr></thead><tbody>
        <tr><td class="name">Electrostatics Worksheet</td><td>Assignment</td><td>Class 12 – A</td><td>28 Nov 2026</td><td>34 / 41</td><td>${statusPill('Published')}</td></tr>
        <tr><td class="name">Organic Chemistry Quiz</td><td>Quiz</td><td>Class 11 – B</td><td>30 Nov 2026</td><td>12 / 38</td><td>${statusPill('Published')}</td></tr>
        <tr><td class="name">Mid-term — Mathematics</td><td>Assessment</td><td>Class 10 – All</td><td>05 Dec 2026</td><td>—</td><td>${statusPill('Draft')}</td></tr>
        <tr><td class="name">Essay: Freedom Movement</td><td>Assignment</td><td>Class 8 – A</td><td>02 Dec 2026</td><td>20 / 32</td><td>${statusPill('Published')}</td></tr>
      </tbody></table></div></div>`;
  }
  function bindLearning() {
    const create = (type = 'Assignment') => openModal({
      title: `New ${type}`, body: `<form id="actForm" class="form-grid">
        <div class="field full"><label>Title <span class="req">*</span></label><input class="input" name="t" required /></div>
        <div class="field"><label>Type</label><select class="select">${['Assignment', 'Quiz', 'Assessment'].map((x) => `<option ${x === type ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label>Class</label><select class="select">${classOpts('Class 12')}</select></div>
        <div class="field"><label>Subject</label><select class="select">${subjOpts('Physics')}</select></div>
        <div class="field"><label>Due Date</label><input class="input" type="date" value="2026-12-05" /></div>
        <div class="field full"><label>Instructions</label><textarea class="textarea"></textarea></div></form>`,
      foot: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" form="actForm" type="submit">Create</button>',
      onMount: (r) => ($('#actForm', r).onsubmit = (e) => { e.preventDefault(); if (!e.target.t.value.trim()) return toast('Title is required', true); closeModal(); toast(`${type} “${e.target.t.value}” created`); }),
    });
    $('#newActivity').onclick = () => create();
    $$('[data-learn]').forEach((el) => {
      const open = () => {
        const l = LEARNING[+el.dataset.learn];
        if (l.t === 'Assignments') create('Assignment');
        else if (l.t === 'Quizzes / Tests') create('Quiz');
        else if (l.t === 'Assessments') create('Assessment');
        else if (l.t === 'Exam Settings') settingsModal('exam');
        else toast(`${l.t} — ${l.n ? fmt(l.n) + ' items' : 'opened'}`);
      };
      el.onclick = open; el.onkeydown = (e) => e.key === 'Enter' && open();
    });
  }

  /* ==========================================================
     8. REPORTS & ANALYTICS
     ========================================================== */
  function viewReports() {
    const r = state.reports;
    const h = (r.cls + r.subject + r.range).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const j = (n, spread) => n + ((h * 7) % spread) - spread / 2;
    const kpi = [
      ['raStudents', fmt(Math.round(j(4286, 300))), 'Total Students'],
      ['raCompletion', Math.round(j(78, 10)) + '%', 'Avg. Completion'],
      ['raScore', Math.round(j(72, 12)) + '%', 'Avg. Score'],
      ['raAttendance', Math.round(j(92, 6)) + '%', 'Attendance'],
    ];
    const comp = [30, 55, 75, 90].map((v, i) => Math.min(100, Math.round(j(v, 10) + i)));
    const score = [45, 52, 68, 80].map((v) => Math.min(100, Math.round(j(v, 8))));
    const top = [['Class 12 – A', 92], ['Class 12 – B', 88], ['Class 11 – A', 81], ['Class 11 – B', 77], ['Class 10 – A', 74]].map(([n, v]) => [n, Math.min(99, Math.round(j(v, 6)))]).sort((a, b) => b[1] - a[1]);
    const sel = (id, opts, v) => `<select class="select sm" id="${id}">${opts.map((o) => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    return `${pageHead('Reports & Analytics', 'Track learning progress, scores and attendance.', 'dashboard',
      `${sel('rCls', Array.from({ length: 7 }, (_, i) => `Class ${i + 6}`), r.cls)}${sel('rSub', DB.subjects, r.subject)}${sel('rRange', ['This Week', 'This Month', 'This Term'], r.range)}
       <button class="btn btn-outline" id="exportBtn">${icon('upload')}Export</button>`)}
    <div class="kpis">${kpi.map(([ic, n, l]) => `<div class="card kpi"><div class="kpi-img">${img(ic, '', l)}</div><div><div class="num">${n}</div><div class="lbl">${l}</div></div></div>`).join('')}</div>
    <div class="dash-grid">
      <div class="card card-pad"><div class="card-head"><h3>Learning Progress</h3><span class="spacer"></span><span class="muted" style="font-size:12.5px">${r.cls} · ${r.subject}</span></div>
        ${lineChart({ labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], max: 100, ticks: 5, format: (v) => v + '%', label: 'Content completion and assessment score per week',
          series: [{ name: 'Content Completion', color: '#2b78f6', data: comp, area: true }, { name: 'Assessment Score', color: '#10b3a3', data: score }] })}
      </div>
      <div class="card card-pad"><div class="card-head"><h3>Top Performing Classes</h3></div>
        <div class="rank-list">${top.map(([n, v], i) => `<div class="rank"><span class="pos">${i + 1}</span><div class="body"><div class="top"><span>${n}</span><span>${v}%</span></div><div class="bar"><i style="width:${v}%"></i></div></div></div>`).join('')}</div>
      </div>
    </div>`;
  }
  function bindReports() {
    const r = state.reports;
    $('#rCls').onchange = (e) => { r.cls = e.target.value; render(); };
    $('#rSub').onchange = (e) => { r.subject = e.target.value; render(); };
    $('#rRange').onchange = (e) => { r.range = e.target.value; render(); };
    $('#exportBtn').onclick = () => {
      const rows = [['Class', 'Subject', 'Range'], [r.cls, r.subject, r.range], [], ['Metric', 'Value'],
        ...$$('.kpi').map((k) => [k.querySelector('.lbl').textContent, k.querySelector('.num').textContent]),
        [], ['Top Classes', 'Score'], ...$$('.rank').map((k) => [...k.querySelectorAll('.top span')].map((s) => s.textContent))];
      const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `report-${r.cls.replace(' ', '')}-${r.subject}.csv`; a.click();
      toast('Report exported');
    };
  }

  /* ==========================================================
     9. COMMUNICATION
     ========================================================== */
  function viewCommunication() {
    const st = state.comm;
    return `${pageHead('Messages & Announcements', 'Broadcast announcements and read messages from teachers and students.', 'dashboard',
      `<button class="btn btn-primary" id="newAnn">${icon('plus')}New Announcement</button>`)}
    <div class="card">
      <div class="toolbar" style="padding-bottom:0;border:0"><div class="line-tabs" style="flex:1">
        ${['Announcements', 'Messages'].map((t) => `<button data-comm="${t}" class="${t === st.tab ? 'active' : ''}">${t}<span class="count">${t === 'Messages' ? DB.messages.filter((m) => m.unread).length + ' new' : DB.announcements.length}</span></button>`).join('')}
      </div></div>
      <div class="ann-list" id="annList">${st.tab === 'Announcements'
        ? DB.announcements.map((a, i) => `<div class="ann"><span class="ann-img t-${a.tone}">${img(ANN_IMG[a.kind] || 'cmMegaphone', '', '')}</span>
            <div class="meta"><strong>${esc(a.title)}</strong><small>${esc(a.body)}</small><small class="date-m">${a.date}</small></div><span class="date">${a.date}</span>
            <div class="menu-wrap"><button class="icon-btn" style="border:0" data-menu="${i}" aria-label="More">${icon('more')}</button>
              <div class="dropdown" id="dd${i}"><button data-aedit="${i}">${icon('edit')}Edit</button><button class="danger" data-adel="${i}">${icon('trash')}Delete</button></div></div></div>`).join('') || '<div class="empty">No announcements yet.</div>'
        : DB.messages.map((m, i) => `<div class="ann ${m.unread ? 'unread' : ''}" data-msg="${i}" style="cursor:pointer">${avatar(m.from)}
            <div class="meta"><strong>${esc(m.subject)}</strong><small>${esc(m.from)} — ${esc(m.snippet)}</small><small class="date-m">${m.date}</small></div><span class="date">${m.date}</span></div>`).join('')}
      </div>
    </div>`;
  }
  function annModal(a) {
    openModal({
      title: a ? 'Edit Announcement' : 'New Announcement',
      body: `<form id="annForm" class="form-grid">
        <div class="field full"><label>Title <span class="req">*</span></label><input class="input" name="title" required value="${esc(a?.title || '')}" /></div>
        <div class="field full"><label>Message <span class="req">*</span></label><textarea class="textarea" name="body" required>${esc(a?.body || '')}</textarea></div>
        <div class="field"><label>Audience</label><select class="select" name="aud"><option>All Users</option><option>Students</option><option>Teachers</option>${Array.from({ length: 7 }, (_, i) => `<option>Class ${i + 6}</option>`).join('')}</select></div>
        <div class="field"><label>Priority</label><select class="select" name="tone"><option value="blue">Normal</option><option value="orange">Important</option><option value="red">Urgent</option></select></div>
        <div class="toggle-row full"><div class="meta"><strong>Also send via Email & SMS</strong><small>Uses configured integrations</small></div><label class="switch"><input type="checkbox" /><span></span></label></div></form>`,
      foot: `<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" form="annForm" type="submit">${icon('megaphone')}${a ? 'Save' : 'Publish'}</button>`,
      onMount: (r) => ($('#annForm', r).onsubmit = (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        if (!d.title.trim() || !d.body.trim()) return toast('Title and message are required', true);
        if (a) Object.assign(a, { title: d.title, body: d.body, tone: d.tone });
        else DB.announcements.unshift({ title: d.title, body: d.body, tone: d.tone, kind: d.tone === 'red' ? 'alert' : 'megaphone',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) });
        closeModal(); state.comm.tab = 'Announcements'; render(); toast(a ? 'Announcement updated' : 'Announcement published');
      }),
    });
  }
  function bindCommunication() {
    $('#newAnn').onclick = () => annModal();
    $$('[data-comm]').forEach((b) => (b.onclick = () => { state.comm.tab = b.dataset.comm; render(); }));
    $('#annList').onclick = (e) => {
      const b = e.target.closest('[data-menu],[data-aedit],[data-adel],[data-msg]'); if (!b) return;
      if (b.dataset.menu !== undefined) {
        const dd = $('#dd' + b.dataset.menu), open = dd.classList.contains('show');
        $$('.dropdown').forEach((d) => d.classList.remove('show')); if (!open) dd.classList.add('show');
        e.stopPropagation();
      } else if (b.dataset.aedit !== undefined) annModal(DB.announcements[+b.dataset.aedit]);
      else if (b.dataset.adel !== undefined) { const a = DB.announcements.splice(+b.dataset.adel, 1)[0]; render(); toast(`“${a.title}” deleted`); }
      else if (b.dataset.msg !== undefined) {
        const m = DB.messages[+b.dataset.msg]; m.unread = false;
        openModal({ title: m.subject, body: `<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">${avatar(m.from)}<div><strong>${esc(m.from)}</strong><br/><small class="muted">${m.date}</small></div></div><p>${esc(m.snippet)}</p>
          <div class="field"><label>Reply</label><textarea class="textarea" id="replyTxt" placeholder="Type your reply…"></textarea></div>`,
          foot: `<button class="btn btn-outline" data-close>Close</button><button class="btn btn-primary" id="sendReply">${icon('mail')}Send Reply</button>`,
          onMount: (r) => ($('#sendReply', r).onclick = () => { if (!$('#replyTxt', r).value.trim()) return toast('Reply is empty', true); closeModal(); toast(`Reply sent to ${m.from}`); }) });
        render();
      }
    };
  }

  /* ==========================================================
     10. SYSTEM SETTINGS
     ========================================================== */
  const SETTINGS = [
    { key: 'general', img: 'ssGeneral', t: 'General', s: 'Institute, logo, theme' },
    { key: 'roles', img: 'ssRoles', t: 'Roles & Permissions', s: 'Admin, Teacher, Student' },
    { key: 'tags', img: 'ssTags', t: 'Categories & Tags', s: 'Material organization' },
    { key: 'integrations', img: 'ssIntegrations', t: 'Integrations', s: 'SSO, Email, SMS' },
    { key: 'scorm', img: 'ssScorm', t: 'SCORM Settings', s: 'Tracking, Completion' },
    { key: 'backup', img: 'ssBackup', t: 'Backup & Maintenance', s: 'Data, restore, logs' },
  ];
  const SETTING_TOGGLES = {
    roles: { title: 'Roles & Permissions', rows: [['Teachers can upload materials', 'Materials go to review before publishing', 1], ['Teachers can create quizzes', '', 1], ['Students can message teachers', '', 1], ['Students can download PDFs', '', 0]] },
    integrations: { title: 'Integrations', rows: [['Google SSO', 'Sign in with Google Workspace', 1], ['Microsoft SSO', 'Sign in with Microsoft 365', 0], ['Email (SMTP)', 'Send announcements by email', 1], ['SMS Gateway', 'Send urgent alerts by SMS', 0]] },
    scorm: { title: 'SCORM Settings', rows: [['Track completion status', 'cmi.core.lesson_status', 1], ['Track score', 'Sync score to gradebook', 1], ['Allow re-attempts', 'Students can retake modules', 1], ['Open in new window', 'Launch player in a popup', 0]] },
    backup: { title: 'Backup & Maintenance', rows: [['Automatic daily backup', 'Runs every night at 2:00 AM', 1], ['Keep audit logs', 'Retain logs for 180 days', 1], ['Maintenance mode', 'Only admins can sign in', 0]] },
    exam: { title: 'Exam Settings', rows: [['Negative marking', 'Deduct 0.25 per wrong answer', 0], ['Shuffle questions', 'Randomize order per student', 1], ['Auto-submit on timeout', '', 1], ['Show results immediately', '', 0]] },
  };
  const toggleRows = (rows) => rows.map(([t, s, on]) => `<div class="toggle-row"><div class="meta"><strong>${t}</strong>${s ? `<small>${s}</small>` : ''}</div><label class="switch"><input type="checkbox" ${on ? 'checked' : ''} /><span></span></label></div>`).join('');
  function settingsModal(key) {
    if (key === 'general') {
      return openModal({ title: 'General Settings', body: `<form class="form-grid" id="genForm">
        <div class="field full"><label>Institute Name</label><input class="input" value="Learning Universe" /></div>
        <div class="field"><label>Contact Email</label><input class="input" type="email" value="admin@learninguniverse.edu" /></div>
        <div class="field"><label>Time Zone</label><select class="select"><option>Asia/Kolkata (IST)</option><option>UTC</option></select></div>
        <div class="field"><label>Logo</label><input class="input" type="file" accept="image/*" /></div>
        <div class="field"><label>Theme Color</label><input class="input" type="color" value="#1a62e8" style="height:42px;padding:4px" id="themeColor" /></div></form>`,
        foot: '<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="saveGen">Save</button>',
        onMount: (r) => ($('#saveGen', r).onclick = () => {
          const c = $('#themeColor', r).value;
          document.documentElement.style.setProperty('--blue-600', c); document.documentElement.style.setProperty('--blue-500', c);
          closeModal(); toast('General settings saved');
        }) });
    }
    if (key === 'tags') {
      const tags = ['Revision', 'Exam Prep', 'Lab', 'Homework', 'Interactive', 'Notes'];
      return openModal({ title: 'Categories & Tags', body: `<div style="display:flex;flex-wrap:wrap;gap:8px" id="tagList">${tags.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
        <form id="tagForm" style="display:flex;gap:10px;margin-top:16px"><input class="input" name="t" placeholder="New tag…" /><button class="btn btn-primary">${icon('plus')}Add</button></form>`,
        foot: '<button class="btn btn-primary" data-close>Done</button>',
        onMount: (r) => ($('#tagForm', r).onsubmit = (e) => { e.preventDefault(); const v = e.target.t.value.trim(); if (v) { $('#tagList', r).insertAdjacentHTML('beforeend', `<span class="chip">${esc(v)}</span>`); e.target.reset(); } }) });
    }
    const cfg = SETTING_TOGGLES[key];
    openModal({ title: cfg.title, body: toggleRows(cfg.rows),
      foot: `<button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="saveT">Save</button>`,
      onMount: (r) => ($('#saveT', r).onclick = () => {
        $$('input[type=checkbox]', r).forEach((c, i) => (cfg.rows[i][2] = c.checked ? 1 : 0));
        closeModal(); toast(`${cfg.title} saved`);
      }) });
  }
  function viewSettings() {
    return `${pageHead('System Settings', 'Configure your institute, permissions, integrations and maintenance.', 'dashboard')}
    <div class="feature-grid">${SETTINGS.map((s) => `
      <div class="card feature" data-set="${s.key}" tabindex="0" role="button"><div class="feature-img">${img(s.img, '', s.t)}</div><h3>${s.t}</h3><p>${s.s}</p></div>`).join('')}</div>`;
  }
  function bindSettings() {
    $$('[data-set]').forEach((el) => { el.onclick = () => settingsModal(el.dataset.set); el.onkeydown = (e) => e.key === 'Enter' && settingsModal(el.dataset.set); });
  }

  /* ---------- Router ---------- */
  const ROUTES = {
    dashboard: [viewDashboard, bindDashboard, 'Dashboard'],
    users: [viewUsers, bindUsers, 'Users'],
    academic: [viewAcademic, bindAcademic, 'Academic Setup'],
    'academic/classes': [viewClasses, bindClasses, 'Classes'],
    'academic/create-class': [viewCreateClass, bindCreateClass, 'Create Class'],
    content: [viewContent, bindContent, 'Content Library'],
    'content/upload': [viewUpload, bindUpload, 'Upload Material'],
    learning: [viewLearning, bindLearning, 'Learning & Activities'],
    reports: [viewReports, bindReports, 'Reports & Analytics'],
    communication: [viewCommunication, bindCommunication, 'Communication'],
    settings: [viewSettings, bindSettings, 'System Settings'],
  };
  const currentRoute = () => { const r = location.hash.replace(/^#\/?/, ''); return ROUTES[r] ? r : 'dashboard'; };

  let lastRoute = null;
  function render() {
    const r = currentRoute(), [v, b, title] = ROUTES[r];
    const scroll = r === lastRoute ? window.scrollY : 0;
    view.innerHTML = v();
    b && b();
    $$('[data-go]', view).forEach((el) => (el.onclick = () => go(el.dataset.go)));
    const top = r.split('/')[0];
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === top));
    document.title = `${title} · Learning Universe Admin`;
    if (r !== lastRoute) { view.style.animation = 'none'; void view.offsetWidth; view.style.animation = ''; }
    window.scrollTo(0, scroll);
    lastRoute = r;
    closeMenu();
  }
  window.addEventListener('hashchange', render);

  /* ---------- Responsive helpers ---------- */
  // On phones, .tbl.stack tables become stacked cards; each cell shows its column name from data-label.
  function labelStackTables(root = view) {
    $$('table.tbl.stack', root).forEach((t) => {
      const heads = $$('thead th', t).map((th) => th.textContent.trim());
      $$('tbody tr', t).forEach((tr) => [...tr.children].forEach((td, i) => {
        if (td.dataset.label !== undefined) return;
        td.dataset.label = heads[i] || '';
        if (td.querySelector('input[type=checkbox]')) td.classList.add('cell-check');
        if (td.querySelector('.actions')) td.classList.add('cell-actions');
      }));
    });
  }
  new MutationObserver(() => labelStackTables()).observe(view, { childList: true, subtree: true });

  // Charts are drawn at a compact size on small screens so their text stays readable; re-draw when crossing the breakpoint.
  let wasCompact = window.innerWidth < 640;
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const c = window.innerWidth < 640;
      if (c !== wasCompact) { wasCompact = c; if (view.querySelector('.chart')) render(); }
      if (window.innerWidth > 860) closeMenu();
    }, 150);
  });

  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  render();
})();
