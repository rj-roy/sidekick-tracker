import { ApiResponse } from "@/types/apiTypes";
import { redirect } from "next/navigation";

export const statusHandler = async <T>(res: Response): Promise<ApiResponse<T>> => {
  const redirectMap: Record<number, string> = {
    401: "/unauthorized",
    403: "/forbidden",
  };

  const path = redirectMap[res.status];

  if (path) {
    redirect(path);
  }

  const headers = res.headers;
  const result = (await res.json()) as ApiResponse<T>;

  if (!res.ok) {
    return { success: false, message: result.message };
  };

  return { ...result, headers };
};