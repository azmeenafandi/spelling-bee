CREATE TABLE words (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  spelling    TEXT    NOT NULL,
  definition  TEXT    NOT NULL,
  variant     TEXT    NOT NULL CHECK(variant IN ('british', 'american', 'both')),
  length      INTEGER NOT NULL,
  obscurity   INTEGER NOT NULL CHECK(obscurity BETWEEN 1 AND 5)
);
