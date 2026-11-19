const DAYS_ORDER = ["Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма", "Сенбі"];
const TOKEN_KEY = "unischedule_token_v2";

let db = { groups: [], teachers: [], subjects: [], rooms: [], schedule: [] };
let currentUser = null;

async function api(path, method = "GET", body) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = "Bearer " + token;

  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("Серверге қосыла алмады. Терминалда «npm start» іске қосылғанын және сайт http://localhost:3000 арқылы ашылғанын тексеріңіз.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error((data && data.error) || "Сервер қатесі");
  return data;
}

async function loadData() {
  db = await api("/data");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ==========================================
// 1. НАВИГАЦИЯ ЖӘНЕ БЕТТЕРДІ АУЫСТЫРУ
// ==========================================
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view-section");

function switchView(viewId) {
  views.forEach((v) => v.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
  navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === viewId));
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.view === "adminView" && currentUser?.role !== "admin") return;
    switchView(btn.dataset.view);
  });
});

document.querySelectorAll(".tab-btn").forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".admin-tab-content").forEach((c) => c.classList.add("hidden"));
    tabBtn.classList.add("active");
    document.getElementById(tabBtn.dataset.tab).classList.remove("hidden");
  });
});

// ==========================================
// 2. АВТОРИЗАЦИЯ ЖӘНЕ ТІРКЕЛУ
// ==========================================
const authModal = document.getElementById("authModal");
const authModalTitle = document.getElementById("authModalTitle");
const authAlert = document.getElementById("authAlert");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const switchToLogin = document.getElementById("switchToLogin");
const switchToRegister = document.getElementById("switchToRegister");
const adminLoginBanner = document.getElementById("adminLoginBanner");

const regRole = document.getElementById("regRole");
const regStudentGroupWrapper = document.getElementById("regStudentGroupWrapper");
const regTeacherDeptWrapper = document.getElementById("regTeacherDeptWrapper");
const regGroup = document.getElementById("regGroup");
const regDepartment = document.getElementById("regDepartment");

function showAuthAlert(msg, type = "error") {
  authAlert.textContent = msg;
  authAlert.className = `alert ${type === "error" ? "alert-error" : "alert-success"}`;
  authAlert.classList.remove("hidden");
}

function openAuthModal(mode = "login", isAdminMode = false) {
  authAlert.classList.add("hidden");
  authModal.classList.remove("hidden");
  setAuthMode(mode, isAdminMode);
}

function setAuthMode(mode, isAdminMode = false) {
  authAlert.classList.add("hidden");
  if (mode === "login") {
    authModalTitle.textContent = isAdminMode ? "Әкімші ретінде кіру" : "Жүйеге кіру";
    switchToLogin.classList.add("active");
    switchToRegister.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    adminLoginBanner.classList.toggle("hidden", !isAdminMode);
    if (isAdminMode) {
      document.getElementById("loginEmail").value = "admin@uni.kz";
      document.getElementById("loginPassword").focus();
    }
  } else {
    authModalTitle.textContent = "Тіркелу (Студент / Оқытушы)";
    switchToRegister.classList.add("active");
    switchToLogin.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    adminLoginBanner.classList.add("hidden");
  }
}

window.fillDemoLogin = function (email, password) {
  document.getElementById("loginEmail").value = email;
  document.getElementById("loginPassword").value = password;
};

document.getElementById("openLoginBtn").addEventListener("click", () => openAuthModal("login", false));
document.getElementById("openAdminLoginBtn").addEventListener("click", () => openAuthModal("login", true));
document.getElementById("openRegisterBtn").addEventListener("click", () => openAuthModal("register", false));
document.getElementById("closeAuthBtn").addEventListener("click", () => authModal.classList.add("hidden"));
switchToLogin.addEventListener("click", () => setAuthMode("login", false));
switchToRegister.addEventListener("click", () => setAuthMode("register", false));

regRole.addEventListener("change", () => {
  if (regRole.value === "student") {
    regStudentGroupWrapper.classList.remove("hidden");
    regTeacherDeptWrapper.classList.add("hidden");
    regDepartment.required = false;
  } else {
    regStudentGroupWrapper.classList.add("hidden");
    regTeacherDeptWrapper.classList.remove("hidden");
    regDepartment.required = true;
  }
});

async function finishAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  currentUser = data.user;
  await loadData();
  populateAllSelects();
  authModal.classList.add("hidden");
  applyUserSession();
  renderAll();
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const role = regRole.value;
  if (role !== "student" && role !== "teacher") {
    showAuthAlert("Тек студент немесе оқытушы ретінде тіркелуге болады!");
    return;
  }

  const fullName = document.getElementById("regFullName").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regPasswordConfirm").value;

  if (password !== confirmPassword) {
    showAuthAlert("Құпия сөздер сәйкес келмейді!");
    return;
  }

  try {
    const data = await api("/register", "POST", {
      role,
      fullName,
      email,
      password,
      group: regGroup.value,
      department: regDepartment.value.trim()
    });
    registerForm.reset();
    regRole.dispatchEvent(new Event("change"));
    await finishAuth(data);
  } catch (err) {
    showAuthAlert(err.message);
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  try {
    const data = await api("/login", "POST", { email, password });
    loginForm.reset();
    await finishAuth(data);
  } catch (err) {
    showAuthAlert(err.message);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await api("/logout", "POST");
  } catch {}
  localStorage.removeItem(TOKEN_KEY);
  currentUser = null;
  applyUserSession();
  switchView("groupView");
  renderAll();
});

function applyUserSession() {
  const guestControls = document.getElementById("guestControls");
  const userControls = document.getElementById("userControls");
  const adminNavBtn = document.querySelector('[data-view="adminView"]');
  const groupSubtitle = document.getElementById("groupSubtitle");
  const teacherSubtitle = document.getElementById("teacherSubtitle");
  const teacherBuilderCard = document.getElementById("teacherScheduleBuilderCard");

  if (!currentUser) {
    guestControls.classList.remove("hidden");
    userControls.classList.add("hidden");
    adminNavBtn.classList.add("hidden");
    teacherBuilderCard.classList.add("hidden");
    groupSubtitle.textContent = "Топты, апта түрін және күнді таңдаңыз";
    teacherSubtitle.textContent = "Оқытушының апталық жүктемесі";
    return;
  }

  guestControls.classList.add("hidden");
  userControls.classList.remove("hidden");

  const roleLabels = { student: "Студент", teacher: "Оқытушы", admin: "Әкімші" };
  document.getElementById("userNameDisplay").textContent = currentUser.fullName;
  document.getElementById("userRoleBadge").textContent = roleLabels[currentUser.role];

  if (currentUser.role === "admin") {
    adminNavBtn.classList.remove("hidden");
    teacherBuilderCard.classList.add("hidden");
    switchView("adminView");
  } else {
    adminNavBtn.classList.add("hidden");
    if (currentUser.role === "student") {
      teacherBuilderCard.classList.add("hidden");
      if (currentUser.group && db.groups.some((g) => g.name === currentUser.group)) {
        document.getElementById("groupSelect").value = currentUser.group;
      }
      groupSubtitle.textContent = `Сіздің тобыңыз: ${currentUser.group || "-"}`;
      switchView("groupView");
    } else if (currentUser.role === "teacher") {
      teacherBuilderCard.classList.remove("hidden");
      const tName = currentUser.teacherName || currentUser.fullName;
      if (db.teachers.some((t) => t.name === tName)) {
        document.getElementById("teacherSelect").value = tName;
      }
      teacherSubtitle.textContent = `Оқытушы: ${tName} — өз кестеңізді құра аласыз`;
      updateTeacherBusySlots();
      switchView("teacherView");
    }
  }
}

// ==========================================
// 3. КЕСТЕНІ КӨРСЕТУ, СҮЗГІЛЕУ ЖӘНЕ ЭКСПОРТ
// ==========================================
const groupSelect = document.getElementById("groupSelect");
const groupWeekFilter = document.getElementById("groupWeekFilter");
const groupDayFilter = document.getElementById("groupDayFilter");
const groupSearchInput = document.getElementById("groupSearchInput");
const groupScheduleContainer = document.getElementById("groupScheduleContainer");

const teacherSelect = document.getElementById("teacherSelect");
const teacherWeekFilter = document.getElementById("teacherWeekFilter");
const teacherDayFilter = document.getElementById("teacherDayFilter");
const teacherScheduleContainer = document.getElementById("teacherScheduleContainer");

function populateAllSelects() {
  const fill = (id, list, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    el.innerHTML = list.map((item) => `<option value="${escapeHtml(item[key])}">${escapeHtml(item[key])}</option>`).join("");
    if (list.some((item) => item[key] === prev)) el.value = prev;
  };

  fill("groupSelect", db.groups, "name");
  fill("regGroup", db.groups, "name");
  fill("admGroup", db.groups, "name");
  fill("tchGroup", db.groups, "name");

  fill("teacherSelect", db.teachers, "name");
  fill("admTeacher", db.teachers, "name");

  fill("admSubject", db.subjects, "name");
  fill("tchSubject", db.subjects, "name");

  fill("admRoom", db.rooms, "number");
  fill("tchRoom", db.rooms, "number");
}

function getTypeClass(type) {
  if (type === "Дәріс") return "type-lecture";
  if (type === "Практика") return "type-practice";
  return "type-lab";
}

function renderScheduleGrid(container, items, mode) {
  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">Таңдалған сүзгі бойынша сабақ табылмады.</div>`;
    return;
  }

  const grouped = {};
  DAYS_ORDER.forEach((d) => (grouped[d] = []));
  items.forEach((item) => {
    if (grouped[item.day]) grouped[item.day].push(item);
  });

  const ownTeacherName = currentUser?.role === "teacher" ? (currentUser.teacherName || currentUser.fullName) : null;

  let html = "";
  DAYS_ORDER.forEach((day) => {
    const lessons = grouped[day].sort((a, b) => a.start.localeCompare(b.start));
    if (lessons.length === 0) return;

    html += `
      <div class="day-card">
        <div class="day-card-header">
          <h3>${day}</h3>
          <span class="lesson-count">${lessons.length} сабақ</span>
        </div>
        <div class="lesson-list">
          ${lessons
            .map((l) => {
              const canTeacherModify = mode === "teacher" && ownTeacherName && l.teacher === ownTeacherName;
              return `
                <div class="lesson-item">
                  <div class="lesson-top">
                    <span class="lesson-time">🕒 ${l.start} – ${l.end}</span>
                    <div class="badges-row">
                      <span class="week-badge">${escapeHtml(l.weekType)}</span>
                      <span class="lesson-type ${getTypeClass(l.type)}">${escapeHtml(l.type)}</span>
                    </div>
                  </div>
                  <div class="lesson-subject">${escapeHtml(l.subject)}</div>
                  <div class="lesson-meta">
                    <span>${mode === "group" ? "👤 " + escapeHtml(l.teacher) : "👥 Топ: " + escapeHtml(l.group)}</span>
                    <span>🚪 Ауд: ${escapeHtml(l.room)}</span>
                  </div>
                  ${
                    canTeacherModify
                      ? `<div class="lesson-actions no-print">
                           <button class="btn-sm btn-edit" onclick="editTeacherLesson(${l.id})">Өңдеу</button>
                           <button class="btn-sm btn-delete" onclick="deleteLesson(${l.id})">Жою</button>
                         </div>`
                      : ""
                  }
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function getFilteredGroupSchedule() {
  const group = groupSelect.value;
  const week = groupWeekFilter.value;
  const day = groupDayFilter.value;
  const query = groupSearchInput.value.trim().toLowerCase();

  return db.schedule.filter((item) => {
    const matchGroup = item.group === group;
    const matchWeek = week === "all" || item.weekType === "Барлық апта" || item.weekType === week;
    const matchDay = day === "all" || item.day === day;
    const matchQuery =
      !query ||
      item.subject.toLowerCase().includes(query) ||
      item.teacher.toLowerCase().includes(query) ||
      item.room.toLowerCase().includes(query);
    return matchGroup && matchWeek && matchDay && matchQuery;
  });
}

function getFilteredTeacherSchedule() {
  const teacher = teacherSelect.value;
  const week = teacherWeekFilter.value;
  const day = teacherDayFilter.value;

  return db.schedule.filter((item) => {
    const matchTeacher = item.teacher === teacher;
    const matchWeek = week === "all" || item.weekType === "Барлық апта" || item.weekType === week;
    const matchDay = day === "all" || item.day === day;
    return matchTeacher && matchWeek && matchDay;
  });
}

function renderGroupView() {
  renderScheduleGrid(groupScheduleContainer, getFilteredGroupSchedule(), "group");
}

function renderTeacherView() {
  renderScheduleGrid(teacherScheduleContainer, getFilteredTeacherSchedule(), "teacher");
  updateTeacherBusySlots();
}

function exportToCSV(items, filename) {
  const headers = ["Күні", "Апта түрі", "Басталуы", "Аяқталуы", "Топ", "Пән", "Түрі", "Оқытушы", "Аудитория"];
  const rows = items.map((i) => [i.day, i.weekType, i.start, i.end, i.group, i.subject, i.type, i.teacher, i.room]);
  const csvContent = "\uFEFF" + [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportGroupCsvBtn").addEventListener("click", () => {
  exportToCSV(getFilteredGroupSchedule(), `keste_${groupSelect.value}.csv`);
});

document.getElementById("exportTeacherCsvBtn").addEventListener("click", () => {
  exportToCSV(getFilteredTeacherSchedule(), `keste_${teacherSelect.value}.csv`);
});

[groupSelect, groupWeekFilter, groupDayFilter].forEach((el) => el.addEventListener("change", renderGroupView));
groupSearchInput.addEventListener("input", renderGroupView);
[teacherSelect, teacherWeekFilter, teacherDayFilter].forEach((el) => el.addEventListener("change", renderTeacherView));

// ==========================================
// 4. ОРТАҚ ҚАҚТЫҒЫСТЫ ТЕКСЕРУ ЛОГИКАСЫ
// ==========================================
function weeksOverlap(w1, w2) {
  return w1 === "Барлық апта" || w2 === "Барлық апта" || w1 === w2;
}

function checkConflict(lesson, ignoreId = null) {
  if (lesson.start >= lesson.end) {
    return "Қате: Аяқталу уақыты басталу уақытынан кейін болуы тиіс!";
  }

  for (const ex of db.schedule) {
    if (ignoreId && ex.id === ignoreId) continue;
    if (ex.day !== lesson.day) continue;
    if (!weeksOverlap(ex.weekType, lesson.weekType)) continue;
    if (!(ex.start < lesson.end && lesson.start < ex.end)) continue;

    if (ex.group === lesson.group) {
      return `Уақыт бос емес! «${lesson.group}» тобында ${ex.start}–${ex.end} аралығында «${ex.subject}» сабағы бар (${ex.teacher}). Бос уақыт таңдаңыз!`;
    }
    if (ex.room === lesson.room) {
      return `Қақтығыс! ${lesson.room} аудиториясы ${ex.start}–${ex.end} аралығында бос емес («${ex.group}» тобы).`;
    }
    if (ex.teacher === lesson.teacher) {
      return `Қақтығыс! ${lesson.teacher} ${ex.start}–${ex.end} аралығында «${ex.group}» тобында сабақта.`;
    }
  }
  return null;
}

// ==========================================
// 5. ОҚЫТУШЫНЫҢ САБАҚ КЕСТЕСІН ҚҰРУ ПАНЕЛІ
// ==========================================
const teacherScheduleForm = document.getElementById("teacherScheduleForm");
const teacherScheduleAlert = document.getElementById("teacherScheduleAlert");
const tchEditId = document.getElementById("tchEditId");
const tchGroup = document.getElementById("tchGroup");
const tchDay = document.getElementById("tchDay");
const tchWeekType = document.getElementById("tchWeekType");
const tchBusySlotsBox = document.getElementById("tchBusySlotsBox");
const tchSubmitBtn = document.getElementById("tchSubmitBtn");
const tchCancelEditBtn = document.getElementById("tchCancelEditBtn");
const teacherScheduleFormTitle = document.getElementById("teacherScheduleFormTitle");

function showTeacherAlert(msg, type = "error") {
  teacherScheduleAlert.textContent = msg;
  teacherScheduleAlert.className = `alert ${type === "error" ? "alert-error" : "alert-success"}`;
  teacherScheduleAlert.classList.remove("hidden");
}

function updateTeacherBusySlots() {
  if (!tchGroup.value) return;
  const ignoreId = tchEditId.value ? Number(tchEditId.value) : null;

  const busy = db.schedule
    .filter(
      (s) =>
        s.id !== ignoreId &&
        s.group === tchGroup.value &&
        s.day === tchDay.value &&
        weeksOverlap(s.weekType, tchWeekType.value)
    )
    .sort((a, b) => a.start.localeCompare(b.start));

  if (busy.length === 0) {
    tchBusySlotsBox.className = "busy-slots-box is-free";
    tchBusySlotsBox.innerHTML = `✅ <strong>${escapeHtml(tchGroup.value)}</strong> тобында <strong>${escapeHtml(tchDay.value)}</strong> күні бос емес сабақтар жоқ — кез келген уақытты таңдай аласыз.`;
  } else {
    tchBusySlotsBox.className = "busy-slots-box";
    const listHtml = busy
      .map((b) => `<span class="week-badge">${b.start}–${b.end} (${escapeHtml(b.subject)})</span>`)
      .join(" ");
    tchBusySlotsBox.innerHTML = `⚠️ <strong>${escapeHtml(tchGroup.value)}</strong> тобының <strong>${escapeHtml(tchDay.value)}</strong> күнгі занятталған (бос емес) уақыттары: ${listHtml}`;
  }
}

[tchGroup, tchDay, tchWeekType].forEach((el) => el.addEventListener("change", updateTeacherBusySlots));

function resetTeacherEditMode() {
  tchEditId.value = "";
  teacherScheduleFormTitle.textContent = "📅 Өз сабақ кестеңізді құру";
  tchSubmitBtn.textContent = "+ Сабақ қосу";
  tchCancelEditBtn.classList.add("hidden");
  updateTeacherBusySlots();
}

tchCancelEditBtn.addEventListener("click", () => {
  resetTeacherEditMode();
  teacherScheduleAlert.classList.add("hidden");
});

window.editTeacherLesson = function (id) {
  const item = db.schedule.find((s) => s.id === id);
  if (!item) return;

  tchEditId.value = item.id;
  tchGroup.value = item.group;
  tchDay.value = item.day;
  tchWeekType.value = item.weekType;
  document.getElementById("tchStart").value = item.start;
  document.getElementById("tchEnd").value = item.end;
  document.getElementById("tchSubject").value = item.subject;
  document.getElementById("tchRoom").value = item.room;
  document.getElementById("tchType").value = item.type;

  teacherScheduleFormTitle.textContent = "✏️ Сабақты өңдеу";
  tchSubmitBtn.textContent = "Сақтау";
  tchCancelEditBtn.classList.remove("hidden");
  teacherScheduleAlert.classList.add("hidden");
  updateTeacherBusySlots();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

teacherScheduleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || currentUser.role !== "teacher") return;

  const editId = tchEditId.value ? Number(tchEditId.value) : null;
  const teacherName = currentUser.teacherName || currentUser.fullName;

  const lessonData = {
    id: editId,
    group: tchGroup.value,
    day: tchDay.value,
    weekType: tchWeekType.value,
    start: document.getElementById("tchStart").value,
    end: document.getElementById("tchEnd").value,
    subject: document.getElementById("tchSubject").value,
    teacher: teacherName,
    room: document.getElementById("tchRoom").value,
    type: document.getElementById("tchType").value
  };

  const err = checkConflict(lessonData, editId);
  if (err) {
    showTeacherAlert(err, "error");
    return;
  }

  try {
    if (editId) {
      await api(`/schedule/${editId}`, "PUT", lessonData);
      showTeacherAlert("Сабақ сәтті жаңартылды!", "success");
      resetTeacherEditMode();
    } else {
      await api("/schedule", "POST", lessonData);
      showTeacherAlert("Сабақ кестеге сәтті қосылды!", "success");
    }
    await loadData();
    teacherSelect.value = teacherName;
    renderAll();
  } catch (error) {
    showTeacherAlert(error.message, "error");
  }
});

// ==========================================
// 6. ӘКІМШІ ПАНЕЛІ (CRUD)
// ==========================================
const scheduleForm = document.getElementById("scheduleForm");
const scheduleFormAlert = document.getElementById("scheduleFormAlert");
const adminEntityAlert = document.getElementById("adminEntityAlert");
const editScheduleId = document.getElementById("editScheduleId");
const scheduleFormTitle = document.getElementById("scheduleFormTitle");
const scheduleSubmitBtn = document.getElementById("scheduleSubmitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

function showScheduleAlert(msg, type = "error") {
  scheduleFormAlert.textContent = msg;
  scheduleFormAlert.className = `alert ${type === "error" ? "alert-error" : "alert-success"}`;
  scheduleFormAlert.classList.remove("hidden");
}

function showAdminEntityAlert(msg, type = "success") {
  adminEntityAlert.textContent = msg;
  adminEntityAlert.className = `alert ${type === "error" ? "alert-error" : "alert-success"}`;
  adminEntityAlert.classList.remove("hidden");
}

scheduleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const editId = editScheduleId.value ? Number(editScheduleId.value) : null;

  const lessonData = {
    id: editId,
    group: document.getElementById("admGroup").value,
    day: document.getElementById("admDay").value,
    weekType: document.getElementById("admWeekType").value,
    start: document.getElementById("admStart").value,
    end: document.getElementById("admEnd").value,
    subject: document.getElementById("admSubject").value,
    teacher: document.getElementById("admTeacher").value,
    room: document.getElementById("admRoom").value,
    type: document.getElementById("admType").value
  };

  const err = checkConflict(lessonData, editId);
  if (err) {
    showScheduleAlert(err, "error");
    return;
  }

  try {
    if (editId) {
      await api(`/schedule/${editId}`, "PUT", lessonData);
      showScheduleAlert("Сабақ сәтті жаңартылды!", "success");
      resetScheduleEditMode();
    } else {
      await api("/schedule", "POST", lessonData);
      showScheduleAlert("Сабақ кестеге сәтті қосылды!", "success");
    }
    await loadData();
    renderAll();
  } catch (error) {
    showScheduleAlert(error.message, "error");
  }
});

function resetScheduleEditMode() {
  editScheduleId.value = "";
  scheduleFormTitle.textContent = "Жаңа сабақ қосу";
  scheduleSubmitBtn.textContent = "+ Кестеге қосу";
  cancelEditBtn.classList.add("hidden");
}

cancelEditBtn.addEventListener("click", () => {
  resetScheduleEditMode();
  scheduleFormAlert.classList.add("hidden");
});

window.editLesson = function (id) {
  const item = db.schedule.find((s) => s.id === id);
  if (!item) return;

  editScheduleId.value = item.id;
  document.getElementById("admGroup").value = item.group;
  document.getElementById("admDay").value = item.day;
  document.getElementById("admWeekType").value = item.weekType;
  document.getElementById("admStart").value = item.start;
  document.getElementById("admEnd").value = item.end;
  document.getElementById("admSubject").value = item.subject;
  document.getElementById("admTeacher").value = item.teacher;
  document.getElementById("admRoom").value = item.room;
  document.getElementById("admType").value = item.type;

  scheduleFormTitle.textContent = "Сабақты өңдеу";
  scheduleSubmitBtn.textContent = "Сақтау";
  cancelEditBtn.classList.remove("hidden");
  scheduleFormAlert.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteLesson = async function (id) {
  try {
    await api(`/schedule/${id}`, "DELETE");
    await loadData();
    renderAll();
  } catch (err) {
    alert(err.message);
  }
};

function renderAdminTables() {
  const sorted = [...db.schedule].sort((a, b) => {
    const d = DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day);
    return d !== 0 ? d : a.start.localeCompare(b.start);
  });

  document.getElementById("adminScheduleTableBody").innerHTML = sorted
    .map(
      (i) => `
    <tr>
      <td>${i.day}<br><small>${escapeHtml(i.weekType)}</small></td>
      <td>${i.start} – ${i.end}</td>
      <td><strong>${escapeHtml(i.group)}</strong></td>
      <td>${escapeHtml(i.subject)}</td>
      <td>${escapeHtml(i.type)}</td>
      <td>${escapeHtml(i.teacher)}</td>
      <td>${escapeHtml(i.room)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-sm btn-edit" onclick="editLesson(${i.id})">Өңдеу</button>
          <button class="btn-sm btn-delete" onclick="deleteLesson(${i.id})">Жою</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  document.getElementById("groupsTableBody").innerHTML = db.groups
    .map(
      (g) => `<tr><td>${escapeHtml(g.name)}</td><td>${g.course}-курс</td><td><button class="btn-sm btn-delete" onclick="deleteEntity('groups', ${g.id})">Жою</button></td></tr>`
    )
    .join("");

  document.getElementById("teachersTableBody").innerHTML = db.teachers
    .map(
      (t) => `<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.dept)}</td><td><button class="btn-sm btn-delete" onclick="deleteEntity('teachers', ${t.id})">Жою</button></td></tr>`
    )
    .join("");

  document.getElementById("subjectsTableBody").innerHTML = db.subjects
    .map(
      (s) => `<tr><td>${escapeHtml(s.name)}</td><td><button class="btn-sm btn-delete" onclick="deleteEntity('subjects', ${s.id})">Жою</button></td></tr>`
    )
    .join("");

  document.getElementById("roomsTableBody").innerHTML = db.rooms
    .map(
      (r) => `<tr><td>${escapeHtml(r.number)}</td><td><button class="btn-sm btn-delete" onclick="deleteEntity('rooms', ${r.id})">Жою</button></td></tr>`
    )
    .join("");
}

window.deleteEntity = async function (collection, id) {
  if (!confirm("Бұл жазбаға байланысты сабақтар да кестеден жойылады. Жалғастырасыз ба?")) return;
  try {
    await api(`/${collection}/${id}`, "DELETE");
    await loadData();
    populateAllSelects();
    renderAll();
    showAdminEntityAlert("Жазба сәтті жойылды!", "success");
  } catch (err) {
    showAdminEntityAlert(err.message, "error");
  }
};

async function addEntity(collection, payload, form, successMsg) {
  try {
    await api(`/${collection}`, "POST", payload);
    form.reset();
    await loadData();
    populateAllSelects();
    renderAll();
    showAdminEntityAlert(successMsg, "success");
  } catch (err) {
    showAdminEntityAlert(err.message, "error");
  }
}

document.getElementById("addGroupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  addEntity(
    "groups",
    {
      name: document.getElementById("newGroupName").value.trim(),
      course: Number(document.getElementById("newGroupCourse").value)
    },
    e.target,
    "Жаңа топ сәтті қосылды!"
  );
});

document.getElementById("addTeacherForm").addEventListener("submit", (e) => {
  e.preventDefault();
  addEntity(
    "teachers",
    {
      name: document.getElementById("newTeacherName").value.trim(),
      dept: document.getElementById("newTeacherDept").value.trim()
    },
    e.target,
    "Оқытушы сәтті қосылды!"
  );
});

document.getElementById("addSubjectForm").addEventListener("submit", (e) => {
  e.preventDefault();
  addEntity("subjects", { name: document.getElementById("newSubjectName").value.trim() }, e.target, "Пән сәтті қосылды!");
});

document.getElementById("addRoomForm").addEventListener("submit", (e) => {
  e.preventDefault();
  addEntity("rooms", { number: document.getElementById("newRoomNumber").value.trim() }, e.target, "Аудитория сәтті қосылды!");
});

document.getElementById("resetDataBtn").addEventListener("click", async () => {
  if (!confirm("Сабақ кестесі демо деректерге қайтарылады. Жалғастырасыз ба?")) return;
  try {
    await api("/admin/reset", "POST");
    await loadData();
    populateAllSelects();
    scheduleFormAlert.classList.add("hidden");
    resetScheduleEditMode();
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

// ==========================================
// 7. БАРЛЫҒЫН ІСКЕ ҚОСУ
// ==========================================
function renderAll() {
  renderGroupView();
  renderTeacherView();
  renderAdminTables();
}

async function init() {
  try {
    await loadData();
    populateAllSelects();
    if (localStorage.getItem(TOKEN_KEY)) {
      try {
        currentUser = (await api("/me")).user;
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    applyUserSession();
    renderAll();
  } catch (err) {
    groupScheduleContainer.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

init();