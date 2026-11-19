-- UniSchedule: SQLite деректер қоры құрылымы
-- Файл: data/unischedule.db (VS Code-та Database кеңейтімімен ашылады)

CREATE TABLE IF NOT EXISTS study_groups (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT    NOT NULL UNIQUE,
  course INTEGER NOT NULL CHECK (course BETWEEN 1 AND 6)
);

CREATE TABLE IF NOT EXISTS teachers (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  dept TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS rooms (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE
);

-- Тіркелген пайдаланушылар (құпия сөз хэш түрінде сақталады)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'student', 'teacher')),
  group_id      INTEGER REFERENCES study_groups(id) ON DELETE SET NULL,
  teacher_id    INTEGER REFERENCES teachers(id)     ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Қазір жүйеде кіріп отырған сессиялар
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Тіркелу және кіру тарихы (сәтсіз әрекеттер де сақталады)
CREATE TABLE IF NOT EXISTS auth_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('register', 'login', 'login_failed', 'logout')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS schedule (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id    INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  subject_id  INTEGER NOT NULL REFERENCES subjects(id)     ON DELETE CASCADE,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id)     ON DELETE CASCADE,
  room_id     INTEGER NOT NULL REFERENCES rooms(id)        ON DELETE CASCADE,
  day         TEXT NOT NULL,
  week_type   TEXT NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  lesson_type TEXT NOT NULL
);
