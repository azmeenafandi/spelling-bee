CREATE TABLE reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id     INTEGER NOT NULL REFERENCES words(id),
  reason      TEXT NOT NULL CHECK(reason IN ('wrong_spelling', 'wrong_definition', 'wrong_variant', 'other')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved    INTEGER NOT NULL DEFAULT 0
);
