import { cookies } from "next/headers";


export async function getCookie(name: string): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value;
};

export async function deleteCookie(name: string) {
    const cookieStore = await cookies();
    return cookieStore.delete(name);
};

export async function setCookie(name: string, value: string, maxAge = 600_000): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: maxAge,
    });
};