const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'carpool.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT DEFAULT 'passenger',
      avatar TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publisher_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      seats INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      description TEXT DEFAULT '',
      current_passengers INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (publisher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      driver_id INTEGER,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (ride_id) REFERENCES rides(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      related_id INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      ride_id INTEGER NOT NULL,
      passenger_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (passenger_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );
  `);

  const rideColumns = new Set(db.prepare('PRAGMA table_info(rides)').all().map((column) => column.name));
  const coordinateColumns = [
    ['origin_latitude', 'REAL'],
    ['origin_longitude', 'REAL'],
    ['destination_latitude', 'REAL'],
    ['destination_longitude', 'REAL']
  ];
  coordinateColumns.forEach(([name, type]) => {
    if (!rideColumns.has(name)) db.exec(`ALTER TABLE rides ADD COLUMN ${name} ${type}`);
  });

  console.log('数据库初始化完成');
}

module.exports = { db, initDatabase };
