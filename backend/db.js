import mysql from 'mysql2/promise';
import { config } from './config.js';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task TEXT NOT NULL,
    owner VARCHAR(120) NOT NULL DEFAULT 'Unassigned',
    priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
    due_date VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

let pool;

/** Lazy pool so the API still boots when MySQL is down. */
function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...config.db, waitForConnections: true, connectionLimit: 10 });
  }
  return pool;
}

export async function saveTasks(tasks) {
  if (tasks.length === 0) return [];

  const values = tasks.map((t) => [t.task, t.owner, t.priority, t.due_date]);
  const [result] = await getPool().query(
    'INSERT INTO tasks (task, owner, priority, due_date) VALUES ?',
    [values]
  );

  return tasks.map((task, i) => ({ id: result.insertId + i, ...task }));
}

export async function listTasks(limit = 50) {
  const [rows] = await getPool().query(
    'SELECT id, task, owner, priority, due_date, created_at FROM tasks ORDER BY id DESC LIMIT ?',
    [limit]
  );
  return rows;
}

export async function isDbUp() {
  try {
    const connection = await getPool().getConnection();
    connection.release();
    return true;
  } catch {
    return false;
  }
}

/** Creates the database + tasks table if they don't exist. Called once on server boot. */
export async function initDb() {
  const { database, ...rest } = config.db;
  const connection = await mysql.createConnection(rest);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
    await connection.changeUser({ database });
    await connection.query(CREATE_TABLE);
  } finally {
    await connection.end();
  }
}
