import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export const validate =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error); // ZodError -> errorHandler -> 400
    req.body = result.data; // validated & typed from here on
    next();
  };
