const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = process.env.DB_PATH || path.join(__dirname, "data.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    apiKey TEXT UNIQUE,
    college TEXT,
    username TEXT,
    password_enc TEXT,
    iv TEXT,
    device TEXT,
    lastFetched INTEGER,
    lastSnapshot TEXT
  )`);
});

module.exports = db;
