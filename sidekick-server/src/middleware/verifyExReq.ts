import type { NextFunction, Request, Response } from "express";
import { deny } from "../utils/denyReq.js";
import { rExRepository } from "../modules/registeredExtesion/r-ex.repository.js";


export async function verifyExReq(
    req: Request,
    res: Response,
    next: NextFunction,
    extensionId: string,
) {
    try {
        const valid = await rExRepository.isExistExtId(extensionId);
        if(!valid) return deny(res);
        next();
    } catch (error) {
        next(error);
    }
};