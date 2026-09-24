import { z } from "zod";

const environmentEnum = z.enum(["low", "medium", "high", "critical"]);
const statusEnum = z.enum(["healthy", "degraded", "down"]);

export const createSchema = z.object({
  name: z.string().trim().min(3).max(60),
  endpointUrl: z.string().max(2000),
  environment: environmentEnum,
  status: statusEnum,
  version: z.string().max(2000),
  ownerEmail: z.string(),
});

export const updateSchema = z.object({
  name: z.string().trim().min(3).max(60).optional(),
  endpointUrl: z.string().max(2000).optional(),
  environment: environmentEnum.optional(),
  status: statusEnum.optional(),
  version: z.string().max(2000).optional(),
});
