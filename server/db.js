import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'wanikani.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY,
    username TEXT,
    level INTEGER,
    max_level INTEGER,
    profile_url TEXT,
    fetched_at TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER UNIQUE,
    subject_id INTEGER,
    subject_type TEXT,
    srs_stage INTEGER,
    available_at TEXT,
    fetched_at TEXT
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY,
    type TEXT,
    level INTEGER,
    characters TEXT,
    meanings TEXT,
    readings TEXT,
    srs_stage INTEGER,
    fetched_at TEXT
  );
`);

// Migration: add srs_stage column if it doesn't exist
try {
  db.exec('ALTER TABLE subjects ADD COLUMN srs_stage INTEGER');
} catch (e) {
  // Column already exists, ignore
}

// Create subject_details table for full subject data
db.exec(`
  CREATE TABLE IF NOT EXISTS subject_details (
    id INTEGER PRIMARY KEY,
    type TEXT,
    level INTEGER,
    characters TEXT,
    meanings TEXT,
    readings TEXT,
    component_subject_ids TEXT,
    amalgamation_subject_ids TEXT,
    meaning_mnemonic TEXT,
    meaning_hint TEXT,
    reading_mnemonic TEXT,
    reading_hint TEXT,
    context_sentences TEXT,
    parts_of_speech TEXT,
    fetched_at TEXT
  );
`);

// Migration: add parts_of_speech column if it doesn't exist
try {
  db.exec('ALTER TABLE subject_details ADD COLUMN parts_of_speech TEXT');
} catch (e) {
  // Column already exists, ignore
}

// Create grammar_lessons table
db.exec(`
  CREATE TABLE IF NOT EXISTS grammar_lessons (
    id INTEGER PRIMARY KEY,
    order_num INTEGER,
    title TEXT,
    description TEXT,
    level TEXT,
    created_at TEXT
  );
`);

// Migration: add level column to grammar_lessons if it doesn't exist
try {
  db.exec('ALTER TABLE grammar_lessons ADD COLUMN level TEXT');
} catch (e) {
  // Column already exists, ignore
}

export default db;
