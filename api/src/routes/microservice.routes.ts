import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { createSchema, updateSchema } from "../schemas/microservice.zod.js";

export const microServiceRouter = Router();
microServiceRouter.use(requireAuth); // everything below needs a JWT

const toResource = (row: any) => ({
  // snake_case -> camelCase at the edge
  id: row.id,
  name: row.name,
  endpointUrl: row.endpoint_url,
  environment: row.environment,
  status: row.status,
  version: row.version,
  ownerEmail: row.owner_email,
  createdAt: row.created_at,
});

// CREATE
microServiceRouter.post(
  "/services",
  validate(createSchema),
  async (req, res) => {
    const { name, endpointUrl, environment, status, version } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO services (name, endpointUrl, environment, status, version, ownerEmail)
     VALUES ($1, $2, 'development', 'healthy', $5, $6) RETURNING *`,
      [name, endpointUrl, environment, status, version, req.ownerEmail],
    );
    res.status(201).json(toResource(rows[0]));
  },
);

// READ ALL (user-scoped)
microServiceRouter.get("/services", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM services WHERE ownerEmail = $1 ORDER BY created_at DESC`,
    [req.ownerEmail],
  );
  res.json(rows.map(toResource));
});

// UPDATE (partial, own-row-only)
microServiceRouter.patch(
  "/services/:id",
  validate(updateSchema),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, "Invalid id");

    const updates: string[] = [];
    const params: unknown[] = [id, req.ownerEmail];
    for (const key of [
      "name",
      "endpointUrl",
      "environment",
      "status",
      "version",
    ] as const) {
      if (req.body[key] !== undefined) {
        params.push(req.body[key]);
        updates.push(`${key} = $${params.length}`);
      }
    }

    const { rows, rowCount } = await pool.query(
      `UPDATE services SET ${updates.join(", ")} WHERE id = $1 AND ownerEmail = $2 RETURNING *`,
      params,
    );
    if (rowCount === 0) throw new HttpError(404, "Resource not found");
    res.json(toResource(rows[0]));
  },
);

// DELETE
microServiceRouter.delete("/services/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "Invalid id");

  const { rowCount } = await pool.query(
    `DELETE FROM services WHERE id = $1 AND ownerEmail = $2`,
    [id, req.ownerEmail],
  );
  if (rowCount === 0) throw new HttpError(404, "Resource not found");
  res.status(204).end();
});
