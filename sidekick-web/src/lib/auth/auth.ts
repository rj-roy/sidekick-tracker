import { signedFetch } from "./signedFetch"

export const auth = async () => {
    const res = await signedFetch('/auth/get/session');
    if(!res.success){
        return null;
    };

    return res.data ?? null;
};