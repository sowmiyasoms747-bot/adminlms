/* Stroke icon set (24x24, currentColor) */
const ICONS = {
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 10v6"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6 0 4.5 1.6 5 4.4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/>',
  userPlus: '<circle cx="10" cy="8" r="4"/><path d="M2.5 21c.8-4 3.8-6.5 7.5-6.5 2 0 3.6.6 4.9 1.7"/><path d="M19 14v6M16 17h6"/>',
  teacher: '<circle cx="8" cy="7" r="3"/><path d="M2.5 20c.5-3.5 2.7-5.5 5.5-5.5 1.8 0 3.3.8 4.3 2.2"/><rect x="12" y="3" width="9.5" height="7" rx="1"/><path d="m14 10-1.5 3"/>',
  building: '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-5h6v5"/><path d="M9 11h.01M15 11h.01"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5v-2Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 4.5 9-4.5" opacity=".5"/>',
  activity: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7M17.5 14v7"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx=".5"/><rect x="12" y="8" width="3" height="10" rx=".5"/><rect x="17" y="5" width="3" height="13" rx=".5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M18 8.5a5 5 0 0 1 0 7"/><path d="M7 14l1.5 5h2.5L10 14"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1"/><path d="m9 13 2 2 4-4"/>',
  quiz: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  grading: '<path d="M3 21h18"/><rect x="5" y="12" width="3" height="6"/><rect x="10.5" y="8" width="3" height="10"/><rect x="16" y="4" width="3" height="14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  timetable: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2M14 17.5h2"/>',
  sitemap: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2.5" y="16" width="6" height="5" rx="1"/><rect x="15.5" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M5.5 16v-4h13v4"/>',
  syllabus: '<path d="M2 5.5C4 4.5 7 4 12 6c5-2 8-1.5 10-.5V20c-2-1-5-1.5-10 .5-5-2-8-1.5-10-.5Z"/><path d="M12 6v14.5"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  plug: '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8Z"/><path d="M12 17v5"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>',
  package: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  cloudUp: '<path d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18"/><path d="M12 12v8M9 15l3-3 3 3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>',
  chevLeft: '<path d="m15 18-6-6 6-6"/>',
  chevRight: '<path d="m9 18 6-6-6-6"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-3v10l-6-3"/>',
  pdf: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

/* Full-colour PNG icons supplied in assert/dashboard */
// "trimmed/" holds copies with the transparent padding cropped off (originals are left untouched)
const IMG_BASE = 'assert/dashboard/trimmed/';
const IMGS = {
  logo: '01_graduation_cap_logo.png',
  // Stat cards
  statStudents: '01_users.png',
  statTeachers: '02_teacher.png',
  statClasses: '03_academic_layers.png',
  statMaterials: '04_open_book.png',
  statAssignments: '05_clipboard.png',
  statQuizzes: '06_growth_analytics.png',
  // Quick actions
  addUser: '07_add_user.png',
  createClass: '08_graduation_cap.png',
  upload: '09_cloud_upload.png',
  viewReports: '10_bar_chart.png',
  // Sidebar / module icons
  navDashboard: '02_dashboard_home.png',
  navUsers: '03_users.png',
  navAcademic: '04_academic_badge.png',
  navContent: '05_document.png',
  navLearning: '06_learning_activities.png',
  navReports: '07_analytics_chart.png',
  navSettings: '08_settings.png',
  // Academic Setup cards (full paths — a different folder)
  acYear: 'assert/Academic%20setup/trimmed/01_academic_year.png',
  acClasses: 'assert/Academic%20setup/trimmed/02_classes.png',
  acSubjects: 'assert/Academic%20setup/trimmed/03_subjects.png',
  acSections: 'assert/Academic%20setup/trimmed/04_sections.png',
  acSyllabus: 'assert/Academic%20setup/trimmed/05_syllabus.png',
  // Content Library
  clSCORM: 'assert/content%20library/trimmed/01_scorm_cube.png',
  clPDF: 'assert/content%20library/trimmed/02_pdf_file.png',
  clVideo: 'assert/content%20library/trimmed/03_video_file.png',
  clDocument: 'assert/content%20library/trimmed/04_document_file.png',
  clPublished: 'assert/content%20library/trimmed/05_published_status.png',
  clDraft: 'assert/content%20library/trimmed/06_draft_status.png',
  clView: 'assert/content%20library/trimmed/07_view_eye.png',
  clEdit: 'assert/content%20library/trimmed/08_edit_pencil.png',
  clMore: 'assert/content%20library/trimmed/09_more_actions.png',
  clCheck: 'assert/content%20library/trimmed/10_select_checkbox.png',
  // Learning & Activities cards
  laAssignments: 'assert/learning%20and%20activities/trimmed/01_assignments.png',
  laQuizzes: 'assert/learning%20and%20activities/trimmed/02_quizzes_tests.png',
  laAssessments: 'assert/learning%20and%20activities/trimmed/03_assessments.png',
  laQuestionBank: 'assert/learning%20and%20activities/trimmed/04_question_bank.png',
  laExamSettings: 'assert/learning%20and%20activities/trimmed/05_exam_settings.png',
  laGrading: 'assert/learning%20and%20activities/trimmed/06_grading_feedback.png',
  // Reports & Analytics KPI tiles
  raStudents: 'assert/report%20and%20analytics/trimmed/01_total_students.png',
  raCompletion: 'assert/report%20and%20analytics/trimmed/02_avg_completion.png',
  raScore: 'assert/report%20and%20analytics/trimmed/03_avg_score.png',
  raAttendance: 'assert/report%20and%20analytics/trimmed/04_attendance.png',
  // Communication (announcement kinds)
  cmMegaphone: 'assert/Communication/trimmed/01_announcement_megaphone.png',
  cmCalendar: 'assert/Communication/trimmed/02_event_calendar.png',
  cmAlert: 'assert/Communication/trimmed/03_alert_bell.png',
  cmMeeting: '03_users.png', // no dedicated icon — reuses the dashboard "users" group icon for meetings
  // System Settings cards
  ssGeneral: 'assert/system%20setting/trimmed/01_general_settings.png',
  ssRoles: 'assert/system%20setting/trimmed/02_roles_permissions.png',
  ssTags: 'assert/system%20setting/trimmed/03_categories_tags.png',
  ssIntegrations: 'assert/system%20setting/trimmed/04_integrations.png',
  ssScorm: 'assert/system%20setting/trimmed/05_scorm_settings.png',
  ssBackup: 'assert/system%20setting/trimmed/06_backup_maintenance.png',
};
// Announcement "kind" → image
const ANN_IMG = { megaphone: 'cmMegaphone', calendar: 'cmCalendar', alert: 'cmAlert', users: 'cmMeeting' };
function img(name, cls = '', alt = '') {
  const f = IMGS[name];
  const src = f.includes('/') ? f : IMG_BASE + f;
  return `<img class="png-ico ${cls}" src="${src}" alt="${alt}" draggable="false" />`;
}

function icon(name, cls = '') {
  const p = ICONS[name] || ICONS.file;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (!el.dataset.hydrated) {
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
      el.dataset.hydrated = '1';
    }
  });
}
