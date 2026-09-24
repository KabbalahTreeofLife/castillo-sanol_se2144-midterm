import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { microServiceRouter } from "./routes/microservice.routes.js";

export const app = express();

app.use(cors()); // dev helper: allow the Vite origin
app.use(express.json()); // parse JSON bodies into req.body

app.get("/api/health", (_req, res) => res.json({ status: "ok" })); // sanity check

app.use("/api", authRouter);
app.use("/api", microServiceRouter);

app.use(errorHandler); // MUST be last — errors bubble down to it
