import { Response } from "express";

export class ApiResponse {
    static success<T>(res: Response, message: string, data?: T, statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    };

    static error(res: Response, message: string, statusCode = 500, error?: unknown) {
        return res.status(statusCode).json({
            success: false,
            message,
            error,
        });
    };
};