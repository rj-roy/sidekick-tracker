import type { Request } from "express";
import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { AuthRepository } from "./auth.repository.js";
import { GoogleTokenResponse, GoogleUserInfo } from "./auth.types.js";
import type { DeviceInfo } from "../session/session.types.js";

export const AuthService = {
    getGoogleAuthUrl(state: string) {
        const params = new URLSearchParams({
            client_id: env.google.clientId,
            redirect_uri: env.google.redirectUrl,
            response_type: "code",
            scope: env.google.scope,
            state,
            access_type: 'offline',
            prompt: 'consent'
        });
        return `${env.google.authUrl}?${params.toString()}`
    },

    deriveDeviceFromRequest(req: Request, deviceId: string): DeviceInfo {
        const ua = req.get("user-agent") ?? "";
        const isMobile = detectMobile(ua);

        return {
            deviceId,
            platform: "web",
            os: detectOS(ua),
            browser: detectBrowser(ua),
            browserVersion: detectBrowserVersion(ua),
            deviceType: isMobile ? "mobile" : "desktop",
            userAgent: ua || undefined,
            isMobile,
        };
    },

    async getCallbackCred(code: string) {
        const tokens = await exchangeCodeForTokens(code);
        const googleUser = await getUserInfo(tokens.access_token);

        if (!googleUser.verified_email) {
            throw new ApiError(403, "Google email is not verified");
        }

        // todo: user may signup with the form not with google signup

        const user = await AuthRepository.upsert({
            googleId: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            emailVerified: !!googleUser.verified_email,
        });

        return { user, tokens };
    },
};

const detectOS = (ua: string): string => {
    if (/windows nt/i.test(ua)) return "windows";
    if (/mac os x|macintosh/i.test(ua)) return "macos";
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua)) return "ios";
    if (/linux/i.test(ua)) return "linux";
    return "unknown";
};

const detectBrowser = (ua: string): string => {
    if (/edg\//i.test(ua)) return "edge";
    if (/opr\/|opera/i.test(ua)) return "opera";
    if (/fxios|firefox/i.test(ua)) return "firefox";
    if (/crios|chrome/i.test(ua)) return "chrome";
    if (/safari/i.test(ua)) return "safari";
    return "unknown";
};

const detectBrowserVersion = (ua: string): string | undefined => {
    const match = ua.match(/(?:edg|chrome|firefox|crios|opera|safari)\/([\d.]+)/i);
    return match?.[1];
};

const detectMobile = (ua: string): boolean => /mobile|android|iphone|ipad/i.test(ua);

const getUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
    const response = await fetch(env.google.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401 || response.status === 403) {
        throw new ApiError(401, "Google authorization failed");
    }

    if (!response.ok) {
        throw new ApiError(502, "Google upstream error");
    }

    const data: unknown = await response.json();

    if (!data || typeof data !== "object" || typeof (data as GoogleUserInfo).email !== "string") {
        throw new ApiError(502, "Malformed response from Google");
    }

    return data as GoogleUserInfo;
};


const exchangeCodeForTokens = async (code: string): Promise<GoogleTokenResponse> => {
    const response = await fetch(env.google.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: env.google.clientId,
            client_secret: env.google.clientSecret,
            redirect_uri: env.google.redirectUrl,
            grant_type: "authorization_code",
        }),
    });

    if (response.status === 401 || response.status === 403) {
        throw new ApiError(401, "Google authorization failed");
    };

    if (!response.ok) {
        throw new ApiError(502, "Google upstream error");
    };

    const data: unknown = await response.json();

    if (!data || typeof data !== "object" || typeof (data as GoogleTokenResponse).access_token !== "string") {
        throw new ApiError(502, "Malformed response from Google");
    }

    return data as GoogleTokenResponse;
};


