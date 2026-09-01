import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiRsponse.js";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  if (env.nodeEnv === "production") {
    return ApiResponse.error(res, "Internal Server Error", 500);
  }

  const message = err instanceof Error ? err.message : "Internal Server Error";
  return ApiResponse.error(res, message, 500);
};

export const notFound = (req: Request, res: Response) => {
  return ApiResponse.error(res, "Route not found", 404);
};