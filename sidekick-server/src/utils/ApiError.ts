export class ApiError extends Error {
    statusCode: number;
    code?: string;

    constructor(statusCode: number, message: string, code?: string) {
        super(message);

        this.statusCode = statusCode;
        this.name = "ApiError";

        if (code) {
            this.code = code;
        }

        Error.captureStackTrace(this, this.constructor);
    };
};