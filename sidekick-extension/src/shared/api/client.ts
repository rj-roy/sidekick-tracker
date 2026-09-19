import { apiReq } from "../utils/apiReq"

export const apiClient = {
    get<T>(path: string): Promise<T> {
        return apiReq(path);
    },
}