import { ObjectId } from "mongodb"
import { ApiError } from "../error/ApiError.js";

export const validateObjectId = (id: unknown, field= "ID"): string => {
    if(typeof id !== "string" || !ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Request");
    };

    return id;
};