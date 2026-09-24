import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";

const email = process.env.SEED_EMAIL ?? "admin@gmail.com";
const password = process.env.SEED_PASSWORD ?? "admin123";
const role = process.env.SEED_ROLE ?? "lead";

const passwordHash = await bcrypt.hash(password, 10);
await pool.query(
  `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [email, passwordHash, role],
);
console.log(`Seeded user: ${email} / ${password} / ${role}`);
await pool.end();
