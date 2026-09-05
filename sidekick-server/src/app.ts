import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

import { authRouter } from "./modules/auth/index.js";
import cookieParser from "cookie-parser";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json());
app.use(cookieParser())

app.use(cors({
    origin: env.appOrigins,
    credentials: true,
}));

app.get("/api/health", async (_req, res) => {
    res.json({ status: "ok", message: "Server is runnig perfectly" });
});

app.use('/auth', authRouter);

app.use(notFound);
app.use(errorHandler);

export { app };