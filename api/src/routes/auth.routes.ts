import { Router } from "express";
import { pool } from "../db.js";
import { HttpError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.zod.js";
import { comparePassword, hashPassword, signToken } from "../security.js";

export const authRouter = Router();

authRouter.post("/auth/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email],
  );
  const user = rows[0];
  if (!user) throw new HttpError(401, "Invalid credentials");

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  res.json({
    token: signToken({ id: user.id, email: user.email }),
    user: { id: user.id, email: user.email },
  });
});

authRouter.post(
  "/auth/register",
  validate(registerSchema),
  async (req, res) => {
    const { email, password } = req.body;

    const { rowCount } = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if ((rowCount ?? 0) > 0)
      throw new HttpError(409, "Email already registered");

    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, passwordHash],
    );
    const user = rows[0];

    res
      .status(201)
      .json({ token: signToken({ id: user.id, email: user.email }), user });
  },
);
