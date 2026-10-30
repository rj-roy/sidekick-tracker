import { ApiResponse } from "@/types/apiTypes";
import { redirect } from "next/navigation";

export const statusHandler = async <T>(
  res: Response,
  { redirectOnAuthError = true }: { redirectOnAuthError?: boolean } = {}
): Promise<ApiResponse<T>> => {
  const redirectMap: Record<number, string> = {
    401: "/unauthorized",
    403: "/forbidden",
  };

  const path = redirectMap[res.status];

  if (path && redirectOnAuthError) {
    redirect(path);
  }

  const headers = res.headers;
  const result = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !result?.success) {
    return { success: false, message: result?.message || res.statusText };
  };

  return { ...result, headers };
};