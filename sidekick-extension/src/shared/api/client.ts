import { apiReq } from "../utils/apiReq"

export const apiClient = {
    get<T>(path: string): Promise<T> {
        return apiReq(path, { method: "GET" });
    },

    post<T>(path: string, body?: unknown): Promise<T> {
        return apiReq(path, {
            method: "POST",
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    },
}
