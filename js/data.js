/* Mock data for the Admin LMS. Replace with API calls when a backend is available. */
(function () {
  // Deterministic pseudo-random so the data is stable between reloads
  let seed = 42;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  const first = ['Arjun', 'Kavya', 'Pranav', 'Divya', 'Rahul', 'Sneha', 'Aditya', 'Meera', 'Karthik', 'Ananya',
    'Vikram', 'Priya', 'Rohan', 'Ishita', 'Siddharth', 'Nithya', 'Harish', 'Lakshmi', 'Varun', 'Deepika',
    'Surya', 'Aishwarya', 'Gokul', 'Keerthana', 'Manoj', 'Pooja', 'Naveen', 'Swathi', 'Ajay', 'Revathi'];
  const lastInit = ['S', 'R', 'K', 'M', 'P', 'V', 'N', 'T', 'A', 'B', 'G', 'J', 'L', 'D'];
  const sections = ['A', 'B', 'C'];

  const fixed = [
    { name: 'Arjun S', cls: 12, section: 'A', email: 'arjun@example.com', status: 'Active' },
    { name: 'Kavya R', cls: 12, section: 'A', email: 'kavya@example.com', status: 'Active' },
    { name: 'Pranav K', cls: 11, section: 'B', email: 'pranav@example.com', status: 'Active' },
    { name: 'Divya M', cls: 11, section: 'A', email: 'divya@example.com', status: 'Inactive' },
  ];

  const students = fixed.map((s, i) => ({ id: 'STU' + String(1001 + i), ...s }));
  for (let i = students.length; i < 4286; i++) {
    const f = pick(first), l = pick(lastInit);
    students.push({
      id: 'STU' + String(1001 + i),
      name: `${f} ${l}`,
      cls: 6 + Math.floor(rnd() * 7),
      section: pick(sections),
      email: `${f.toLowerCase()}.${l.toLowerCase()}${i}@example.com`,
      status: rnd() > 0.9 ? 'Inactive' : 'Active',
    });
  }

  const subjectsList = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science', 'History', 'Geography', 'Tamil', 'Economics'];
  const teacherNames = ['Ms. Nandhini', 'Mr. Ramesh', 'Mrs. Kalpana', 'Mr. Suresh', 'Ms. Janani', 'Mr. Prakash', 'Mrs. Geetha', 'Mr. Balaji',
    'Ms. Shalini', 'Mr. Venkat', 'Mrs. Usha', 'Mr. Dinesh'];
  const teachers = [];
  for (let i = 0; i < 86; i++) {
    const base = teacherNames[i % teacherNames.length];
    const n = i < teacherNames.length ? base : `${base.split(' ')[0]} ${pick(first)}`;
    const slug = n.replace(/^(Ms|Mr|Mrs)\.\s/, '').toLowerCase().replace(/\s+/g, '.');
    teachers.push({
      id: 'TCH' + String(201 + i),
      name: n,
      subject: subjectsList[i % subjectsList.length],
      classes: `Class ${6 + (i % 7)}${i % 2 ? ', ' + (7 + (i % 6)) : ''}`,
      email: `${slug}${i}@learninguniverse.edu`,
      status: rnd() > 0.93 ? 'Inactive' : 'Active',
    });
  }

  const admins = [
    { id: 'ADM01', name: 'Super Admin', role: 'Super Administrator', email: 'admin@learninguniverse.edu', status: 'Active' },
    { id: 'ADM02', name: 'Lavanya P', role: 'Academic Coordinator', email: 'lavanya@learninguniverse.edu', status: 'Active' },
    { id: 'ADM03', name: 'Murali K', role: 'Content Manager', email: 'murali@learninguniverse.edu', status: 'Active' },
    { id: 'ADM04', name: 'Fathima R', role: 'Exam Controller', email: 'fathima@learninguniverse.edu', status: 'Inactive' },
  ];

  const classes = [];
  for (let c = 6; c <= 12; c++) {
    sections.forEach((s, i) => {
      if (c < 9 && s === 'C') return;
      classes.push({
        name: `Class ${c}`, section: s,
        teacher: teacherNames[(c + i) % teacherNames.length],
        subjects: subjectsList.slice(0, c > 10 ? 5 : 4 + (i % 2)),
        students: 28 + Math.floor(rnd() * 14),
      });
    });
  }

  const materials = [
    { title: 'Electric Charges – SCORM', type: 'SCORM', cls: 'Class 12', subject: 'Physics', status: 'Published' },
    { title: 'Unit 1 – Notes', type: 'PDF', cls: 'Class 12', subject: 'Physics', status: 'Published' },
    { title: 'Lecture – Field & Potential', type: 'Video', cls: 'Class 12', subject: 'Physics', status: 'Published' },
    { title: 'Revision Worksheets', type: 'Document', cls: 'Class 12', subject: 'Physics', status: 'Draft' },
    { title: 'Organic Chemistry Basics', type: 'Video', cls: 'Class 11', subject: 'Chemistry', status: 'Published' },
    { title: 'Calculus – Limits Interactive', type: 'SCORM', cls: 'Class 12', subject: 'Mathematics', status: 'Published' },
    { title: 'Cell Structure Notes', type: 'PDF', cls: 'Class 9', subject: 'Biology', status: 'Published' },
    { title: 'Grammar Practice Set', type: 'Document', cls: 'Class 8', subject: 'English', status: 'Draft' },
    { title: 'Python Loops Walkthrough', type: 'Video', cls: 'Class 10', subject: 'Computer Science', status: 'Published' },
    { title: 'Periodic Table Explorer', type: 'SCORM', cls: 'Class 10', subject: 'Chemistry', status: 'Draft' },
    { title: 'Trigonometry Formula Sheet', type: 'PDF', cls: 'Class 11', subject: 'Mathematics', status: 'Published' },
    { title: 'Indian Freedom Movement', type: 'Video', cls: 'Class 8', subject: 'History', status: 'Published' },
  ];

  const announcements = [
    { title: 'Revision Sprint – Class 12', body: 'Starts from 1st Dec 2026', date: '25 Nov 2026', kind: 'megaphone', tone: 'orange' },
    { title: 'Unit Test Schedule', body: 'Class 11 & Class 12', date: '24 Nov 2026', kind: 'calendar', tone: 'red' },
    { title: 'Holiday – 26th Nov', body: 'No classes tomorrow', date: '23 Nov 2026', kind: 'alert', tone: 'rose' },
    { title: 'Parent–Teacher Meeting', body: 'Saturday, 5th Dec 2026 · 10:00 AM', date: '20 Nov 2026', kind: 'users', tone: 'blue' },
  ];

  const messages = [
    { from: 'Ms. Nandhini', subject: 'Class 12-A lab schedule', snippet: 'Could we move Thursday\'s lab to Friday morning?', date: '25 Nov 2026', unread: true },
    { from: 'Mr. Ramesh', subject: 'Quiz bank upload', snippet: 'I have uploaded 40 new questions for Chemistry Unit 3.', date: '24 Nov 2026', unread: true },
    { from: 'Kavya R (Student)', subject: 'SCORM module not loading', snippet: 'The Electric Charges module stops at slide 4.', date: '23 Nov 2026', unread: false },
    { from: 'Mrs. Kalpana', subject: 'Attendance correction', snippet: 'Please update attendance for 21st Nov, Class 9-B.', date: '22 Nov 2026', unread: false },
  ];

  window.DB = {
    students, teachers, admins, classes, materials, announcements, messages,
    subjects: subjectsList,
    teacherNames,
    sections,
    stats: { students: 4286, teachers: 86, classes: 124, materials: 1240, assignments: 308, quizzes: 156 },
    academicYear: '2026 – 2027',
  };
})();
