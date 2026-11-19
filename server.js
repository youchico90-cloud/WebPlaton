const express = require("express");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, "data");
fs.mkdirSync(DB_DIR, { recursive: true });

// ==========================================
// 1. ДЕРЕКТЕР ҚОРЫН ҚОСУ
// ==========================================
const db = new Database(path.join(DB_DIR, "unischedule.db"));
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

const DAYS = ["Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма", "Сенбі"];
const WEEKS = ["Барлық апта", "Тақ апта", "Жұп апта"];
const TYPES = ["Дәріс", "Практика", "Зертхана"];

const idOf = (table, col, value) =>
  db.prepare(`SELECT id FROM ${table} WHERE ${col} = ?`).get(value)?.id ?? null;

// ==========================================
// 2. ҚҰПИЯ СӨЗДІ ХЭШТЕУ (ашық күйде сақталмайды)
// ==========================================
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, "hex");
  return test.length === real.length && crypto.timingSafeEqual(test, real);
}

// ==========================================
// 3. БАСТАПҚЫ (ДЕМО) ДЕРЕКТЕР
// ==========================================
// Атаулар (кестеде қайталанбауы үшін айнымалыға алынған)
const T = {
  AKH: "Ахметов Б.Қ.", SUL: "Сүлейменова Г.Т.", NUR: "Нұрланов Е.А.", KAS: "Қасымова Д.М.",
  ZHU: "Жұмабаев Т.Н.", BAI: "Байжанова Ә.Р.", SER: "Серікбаев Д.О.", TOK: "Тоқтарова М.Ж.",
  OMA: "Омаров С.К.", ABD: "Әбдіғали Н.М."
};
const S = {
  WEB: "Веб-бағдарламалау", DB: "Деректер қоры", ALG: "Алгоритмдер және құрылымдар",
  OS: "Операциялық жүйелер", ENG: "Ағылшын тілі", MATH: "Жоғары математика", PHYS: "Физика",
  NET: "Компьютерлік желілер", SEC: "Ақпараттық қауіпсіздік", OOP: "Объектілі-бағытталған бағдарламалау",
  ECO: "Экономика негіздері", HIST: "Қазақстан тарихы"
};
const R = {
  r101: "101", r102: "102", r112: "112 (Желі зертханасы)", r204: "204", r210: "210",
  r305: "305 (Комп. класс)", r308: "308 (Комп. класс)", r412: "412 (Дәріс залы)",
  r415: "415 (Дәріс залы)", r501: "501 (Физика зертханасы)"
};
const ALL = "Барлық апта", ODD = "Тақ апта", EVEN = "Жұп апта";
const LEC = "Дәріс", PRA = "Практика", LAB = "Зертхана";
const [MON, TUE, WED, THU, FRI] = ["Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма"];
const [P1, P2, P3] = [["09:00", "10:20"], ["10:30", "11:50"], ["12:00", "13:20"]];

const DEMO = {
  groups: [["ИС-21", 2], ["АЖ-22", 2], ["ЕЭ-23", 1], ["ПО-22", 2], ["КБ-23", 1]],
  teachers: [
    [T.AKH, "Ақпараттық жүйелер"],
    [T.SUL, "Бағдарламалық инженерия"],
    [T.NUR, "Компьютерлік ғылымдар"],
    [T.KAS, "Жоғары математика"],
    [T.ZHU, "Физика"],
    [T.BAI, "Шет тілдері"],
    [T.SER, "Ақпараттық қауіпсіздік"],
    [T.TOK, "Экономика және менеджмент"],
    [T.OMA, "Компьютерлік желілер"],
    [T.ABD, "Тарих және философия"]
  ],
  subjects: Object.values(S),
  rooms: Object.values(R),
  schedule: [
    // [топ, күн, апта, [басы, соңы], пән, оқытушы, аудитория, түрі]
    // ---- Дүйсенбі ----
    ["ИС-21", MON, ALL, P1, S.WEB, T.AKH, R.r305, LEC],
    ["АЖ-22", MON, ALL, P1, S.ALG, T.KAS, R.r412, LEC],
    ["ЕЭ-23", MON, ALL, P1, S.ENG, T.BAI, R.r102, PRA],
    ["ПО-22", MON, ALL, P1, S.OOP, T.SUL, R.r308, LAB],
    ["КБ-23", MON, ALL, P1, S.SEC, T.SER, R.r415, LEC],
    ["ИС-21", MON, ODD, P2, S.DB, T.SUL, R.r204, PRA],
    ["ИС-21", MON, EVEN, P2, S.NET, T.OMA, R.r112, LAB],
    ["АЖ-22", MON, ALL, P2, S.MATH, T.KAS, R.r101, PRA],
    ["ЕЭ-23", MON, ALL, P2, S.ECO, T.TOK, R.r210, LEC],
    ["ПО-22", MON, ALL, P2, S.WEB, T.AKH, R.r305, LAB],
    ["КБ-23", MON, ALL, P3, S.HIST, T.ABD, R.r415, LEC],
    ["ИС-21", MON, ALL, P3, S.ENG, T.BAI, R.r102, PRA],
    // ---- Сейсенбі ----
    ["ИС-21", TUE, ALL, P1, S.OS, T.NUR, R.r101, LAB],
    ["АЖ-22", TUE, ALL, P1, S.DB, T.SUL, R.r308, LAB],
    ["ЕЭ-23", TUE, ALL, P1, S.MATH, T.KAS, R.r204, LEC],
    ["ИС-21", TUE, ALL, P2, S.ALG, T.KAS, R.r412, LEC],
    ["АЖ-22", TUE, ALL, P2, S.PHYS, T.ZHU, R.r501, LAB],
    ["ПО-22", TUE, ALL, P2, S.ALG, T.NUR, R.r210, PRA],
    ["ЕЭ-23", TUE, ALL, P3, S.PHYS, T.ZHU, R.r501, PRA],
    ["КБ-23", TUE, ALL, P3, S.NET, T.OMA, R.r112, LAB],
    ["ПО-22", TUE, ALL, P3, S.ENG, T.BAI, R.r102, PRA],
    // ---- Сәрсенбі ----
    ["ИС-21", WED, ALL, P1, S.NET, T.OMA, R.r112, LEC],
    ["АЖ-22", WED, ALL, P1, S.SEC, T.SER, R.r415, LEC],
    ["ЕЭ-23", WED, ALL, P1, S.HIST, T.ABD, R.r412, LEC],
    ["ПО-22", WED, ALL, P2, S.DB, T.SUL, R.r204, LEC],
    ["КБ-23", WED, ALL, P2, S.OS, T.NUR, R.r308, LAB],
    ["ИС-21", WED, ALL, P2, S.WEB, T.AKH, R.r305, LAB],
    ["АЖ-22", WED, ALL, P3, S.OOP, T.SUL, R.r308, PRA],
    ["ИС-21", WED, ODD, P3, S.HIST, T.ABD, R.r412, LEC],
    ["ИС-21", WED, EVEN, P3, S.ECO, T.TOK, R.r210, LEC],
    // ---- Бейсенбі ----
    ["ПО-22", THU, ALL, P1, S.OS, T.NUR, R.r101, LEC],
    ["ЕЭ-23", THU, ALL, P1, S.NET, T.OMA, R.r112, PRA],
    ["ИС-21", THU, ALL, P1, S.MATH, T.KAS, R.r204, LEC],
    ["КБ-23", THU, ALL, P2, S.SEC, T.SER, R.r305, LAB],
    ["АЖ-22", THU, ALL, P2, S.WEB, T.AKH, R.r308, PRA],
    ["ПО-22", THU, ALL, P2, S.MATH, T.KAS, R.r204, PRA],
    ["ЕЭ-23", THU, ALL, P3, S.ENG, T.BAI, R.r102, PRA],
    ["КБ-23", THU, ALL, P3, S.ALG, T.KAS, R.r210, PRA],
    // ---- Жұма ----
    ["ИС-21", FRI, ALL, P1, S.PHYS, T.ZHU, R.r501, LEC],
    ["ПО-22", FRI, ALL, P1, S.ECO, T.TOK, R.r415, LEC],
    ["АЖ-22", FRI, ALL, P2, S.OS, T.NUR, R.r101, PRA],
    ["ЕЭ-23", FRI, ALL, P2, S.ALG, T.KAS, R.r412, LEC],
    ["ИС-21", FRI, ALL, P2, S.OOP, T.SUL, R.r308, LAB],
    ["ПО-22", FRI, ALL, P3, S.HIST, T.ABD, R.r415, LEC],
    ["АЖ-22", FRI, ALL, P3, S.ENG, T.BAI, R.r102, PRA]
  ],
  // [аты-жөні, email, құпия сөз, рөл, топ, оқытушы]
  users: [
    ["Жүйе Әкімшісі", "admin@uni.kz", "admin123", "admin", null, null],
    ["Әлібек Нұрсұлтан", "student@uni.kz", "123456", "student", "ИС-21", null],
    ["Ахметов Б.Қ.", "teacher@uni.kz", "123456", "teacher", null, "Ахметов Б.Қ."]
  ]
};

// Сабақ кестесін демо күйіне қайтарады (пайдаланушылар өшірілмейді)
const resetDemoData = db.transaction(() => {
  db.prepare("DELETE FROM schedule").run();
  for (const [name, course] of DEMO.groups)
    db.prepare("INSERT OR IGNORE INTO study_groups (name, course) VALUES (?, ?)").run(name, course);
  for (const [name, dept] of DEMO.teachers)
    db.prepare("INSERT OR IGNORE INTO teachers (name, dept) VALUES (?, ?)").run(name, dept);
  for (const name of DEMO.subjects)
    db.prepare("INSERT OR IGNORE INTO subjects (name) VALUES (?)").run(name);
  for (const number of DEMO.rooms)
    db.prepare("INSERT OR IGNORE INTO rooms (number) VALUES (?)").run(number);

  const ins = db.prepare(
    `INSERT INTO schedule (group_id, subject_id, teacher_id, room_id, day, week_type, start_time, end_time, lesson_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const [group, day, week, [start, end], subject, teacher, room, type] of DEMO.schedule) {
    ins.run(
      idOf("study_groups", "name", group), idOf("subjects", "name", subject),
      idOf("teachers", "name", teacher), idOf("rooms", "number", room),
      day, week, start, end, type
    );
  }
});

function seedDemoUsers() {
  const ins = db.prepare(
    `INSERT OR IGNORE INTO users (full_name, email, password_hash, role, group_id, teacher_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const [fullName, email, password, role, group, teacher] of DEMO.users) {
    ins.run(
      fullName, email, hashPassword(password), role,
      group ? idOf("study_groups", "name", group) : null,
      teacher ? idOf("teachers", "name", teacher) : null
    );
  }
}

// Алғашқы іске қосуда ғана толтырады
if (db.prepare("SELECT COUNT(*) AS n FROM study_groups").get().n === 0) resetDemoData();
if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n === 0) seedDemoUsers();

// ==========================================
// 4. КӨМЕКШІ ФУНКЦИЯЛАР
// ==========================================
const USER_SQL = `
  SELECT u.id, u.full_name AS fullName, u.email, u.role,
         g.name AS groupName, t.name AS teacherName
  FROM users u
  LEFT JOIN study_groups g ON g.id = u.group_id
  LEFT JOIN teachers t ON t.id = u.teacher_id`;

const toClientUser = (r) =>
  r && { id: r.id, fullName: r.fullName, email: r.email, role: r.role, group: r.groupName, teacherName: r.teacherName };

const logAuth = (userId, email, action) =>
  db.prepare("INSERT INTO auth_logs (user_id, email, action) VALUES (?, ?, ?)").run(userId, email, action);

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  return token;
}

function getSession(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const row = db.prepare(`${USER_SQL} JOIN sessions s ON s.user_id = u.id WHERE s.token = ?`).get(token);
  return row ? { token, user: toClientUser(row) } : null;
}

function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "Алдымен жүйеге кіріңіз." });
  if (session.user.role !== "admin") return res.status(403).json({ error: "Тек әкімшіге рұқсат етілген." });
  next();
}

// ==========================================
// 5. API
// ==========================================
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Тіркелу (тек студент / оқытушы) ---
app.post("/api/register", (req, res) => {
  const { role, fullName = "", email = "", password = "", group, department } = req.body || {};
  const name = String(fullName).trim();
  const mail = String(email).trim().toLowerCase();

  if (role !== "student" && role !== "teacher")
    return res.status(400).json({ error: "Тек студент немесе оқытушы ретінде тіркелуге болады!" });
  if (!name || !mail) return res.status(400).json({ error: "Аты-жөні мен email міндетті!" });
  if (String(password).length < 6) return res.status(400).json({ error: "Құпия сөз кемінде 6 таңба болуы тиіс!" });
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(mail))
    return res.status(409).json({ error: "Бұл email жүйеде тіркелген!" });

  let groupId = null;
  if (role === "student") {
    groupId = idOf("study_groups", "name", group);
    if (!groupId) return res.status(400).json({ error: "Топ табылмады!" });
  }

  const userId = db.transaction(() => {
    let teacherId = null;
    if (role === "teacher") {
      teacherId = idOf("teachers", "name", name);
      if (!teacherId) {
        const dept = String(department || "").trim() || "Жалпы кафедра";
        teacherId = db.prepare("INSERT INTO teachers (name, dept) VALUES (?, ?)").run(name, dept).lastInsertRowid;
      }
    }
    const info = db
      .prepare("INSERT INTO users (full_name, email, password_hash, role, group_id, teacher_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, mail, hashPassword(String(password)), role, groupId, teacherId);
    logAuth(info.lastInsertRowid, mail, "register");
    return info.lastInsertRowid;
  })();

  const token = createSession(userId);
  const user = toClientUser(db.prepare(`${USER_SQL} WHERE u.id = ?`).get(userId));
  res.json({ token, user });
});

// --- Кіру ---
app.post("/api/login", (req, res) => {
  const mail = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  const row = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(mail);
  if (!row || !verifyPassword(password, row.password_hash)) {
    logAuth(row ? row.id : null, mail, "login_failed");
    return res.status(401).json({ error: "Email немесе құпия сөз қате!" });
  }

  logAuth(row.id, mail, "login");
  const token = createSession(row.id);
  const user = toClientUser(db.prepare(`${USER_SQL} WHERE u.id = ?`).get(row.id));
  res.json({ token, user });
});

// --- Шығу ---
app.post("/api/logout", (req, res) => {
  const session = getSession(req);
  if (session) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(session.token);
    logAuth(session.user.id, session.user.email, "logout");
  }
  res.json({ ok: true });
});

// --- Қазіргі пайдаланушы (бет жаңартылғанда сессияны қалпына келтіру) ---
app.get("/api/me", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "Сессия жоқ." });
  res.json({ user: session.user });
});

// --- Барлық кесте деректері (қонақтарға да ашық) ---
app.get("/api/data", (req, res) => {
  res.json({
    groups: db.prepare("SELECT id, name, course FROM study_groups ORDER BY id").all(),
    teachers: db.prepare("SELECT id, name, dept FROM teachers ORDER BY id").all(),
    subjects: db.prepare("SELECT id, name FROM subjects ORDER BY id").all(),
    rooms: db.prepare("SELECT id, number FROM rooms ORDER BY id").all(),
    schedule: db
      .prepare(
        `SELECT s.id, g.name AS "group", s.day, s.week_type AS weekType,
                s.start_time AS start, s.end_time AS "end",
                sub.name AS subject, t.name AS teacher, r.number AS room, s.lesson_type AS type
         FROM schedule s
         JOIN study_groups g ON g.id = s.group_id
         JOIN subjects sub   ON sub.id = s.subject_id
         JOIN teachers t     ON t.id = s.teacher_id
         JOIN rooms r        ON r.id = s.room_id
         ORDER BY s.id`
      )
      .all()
  });
});

// --- Сабақ кестесі (тек әкімші) ---
function lessonFromBody(b = {}) {
  const lesson = {
    group_id: idOf("study_groups", "name", b.group),
    subject_id: idOf("subjects", "name", b.subject),
    teacher_id: idOf("teachers", "name", b.teacher),
    room_id: idOf("rooms", "number", b.room),
    day: b.day,
    week_type: b.weekType,
    start_time: b.start,
    end_time: b.end,
    lesson_type: b.type
  };
  if (!lesson.group_id || !lesson.subject_id || !lesson.teacher_id || !lesson.room_id)
    return { error: "Топ, пән, оқытушы немесе аудитория табылмады." };
  if (!DAYS.includes(lesson.day) || !WEEKS.includes(lesson.week_type) || !TYPES.includes(lesson.lesson_type))
    return { error: "Күн, апта түрі немесе сабақ түрі дұрыс емес." };
  if (!/^\d\d:\d\d$/.test(lesson.start_time || "") || !/^\d\d:\d\d$/.test(lesson.end_time || ""))
    return { error: "Уақыт форматы дұрыс емес." };
  if (lesson.start_time >= lesson.end_time)
    return { error: "Қате: Аяқталу уақыты басталу уақытынан кейін болуы тиіс!" };
  return { lesson };
}

function findConflict(l, ignoreId) {
  const rows = db
    .prepare(
      `SELECT group_id, teacher_id, room_id, week_type, start_time, end_time
       FROM schedule
       WHERE day = ? AND start_time < ? AND ? < end_time AND id != ?`
    )
    .all(l.day, l.end_time, l.start_time, ignoreId ?? -1);

  for (const ex of rows) {
    const weeksOverlap = l.week_type === "Барлық апта" || ex.week_type === "Барлық апта" || l.week_type === ex.week_type;
    if (!weeksOverlap) continue;
    const when = `${ex.start_time}–${ex.end_time}`;
    if (ex.room_id === l.room_id) return `Қақтығыс! Аудитория ${when} аралығында бос емес.`;
    if (ex.teacher_id === l.teacher_id) return `Қақтығыс! Оқытушы ${when} аралығында басқа сабақта.`;
    if (ex.group_id === l.group_id) return `Қақтығыс! Топта ${when} аралығында басқа сабақ бар.`;
  }
  return null;
}

const LESSON_COLS = ["group_id", "subject_id", "teacher_id", "room_id", "day", "week_type", "start_time", "end_time", "lesson_type"];

app.post("/api/schedule", requireAdmin, (req, res) => {
  const { lesson, error } = lessonFromBody(req.body);
  if (error) return res.status(400).json({ error });
  const conflict = findConflict(lesson, null);
  if (conflict) return res.status(409).json({ error: conflict });

  const info = db
    .prepare(`INSERT INTO schedule (${LESSON_COLS.join(", ")}) VALUES (${LESSON_COLS.map(() => "?").join(", ")})`)
    .run(...LESSON_COLS.map((c) => lesson[c]));
  res.json({ id: info.lastInsertRowid });
});

app.put("/api/schedule/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { lesson, error } = lessonFromBody(req.body);
  if (error) return res.status(400).json({ error });
  const conflict = findConflict(lesson, id);
  if (conflict) return res.status(409).json({ error: conflict });

  db.prepare(`UPDATE schedule SET ${LESSON_COLS.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`).run(
    ...LESSON_COLS.map((c) => lesson[c]),
    id
  );
  res.json({ ok: true });
});

app.delete("/api/schedule/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM schedule WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

// --- Демо деректерді қалпына келтіру (тек әкімші) ---
app.post("/api/admin/reset", requireAdmin, (req, res) => {
  resetDemoData();
  res.json({ ok: true });
});

// --- Анықтамалықтар: топтар, оқытушылар, пәндер, аудиториялар (тек әкімші) ---
const ENTITIES = {
  groups: { table: "study_groups", cols: ["name", "course"] },
  teachers: { table: "teachers", cols: ["name", "dept"] },
  subjects: { table: "subjects", cols: ["name"] },
  rooms: { table: "rooms", cols: ["number"] }
};

app.post("/api/:entity", requireAdmin, (req, res, next) => {
  const e = ENTITIES[req.params.entity];
  if (!e) return next();
  const values = e.cols.map((c) => (typeof req.body?.[c] === "string" ? req.body[c].trim() : req.body?.[c]));
  if (values.some((v) => v === undefined || v === null || v === ""))
    return res.status(400).json({ error: "Барлық өрістерді толтырыңыз." });
  try {
    const info = db
      .prepare(`INSERT INTO ${e.table} (${e.cols.join(", ")}) VALUES (${e.cols.map(() => "?").join(", ")})`)
      .run(...values);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.code).startsWith("SQLITE_CONSTRAINT"))
      return res.status(409).json({ error: "Мұндай жазба бар немесе мән жарамсыз." });
    throw err;
  }
});

app.delete("/api/:entity/:id", requireAdmin, (req, res, next) => {
  const e = ENTITIES[req.params.entity];
  if (!e) return next();
  db.prepare(`DELETE FROM ${e.table} WHERE id = ?`).run(Number(req.params.id));
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Серверде қате орын алды." });
});

app.listen(PORT, () => {
  console.log(`UniSchedule іске қосылды: http://localhost:${PORT}`);
  console.log(`Деректер қоры: ${path.join(DB_DIR, "unischedule.db")}`);
});