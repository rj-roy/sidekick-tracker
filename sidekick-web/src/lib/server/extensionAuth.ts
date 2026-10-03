export const isTrustedExtension = (req: Request): boolean => {
    if (req.headers.get("x-client-type") !== "extension") {
        return false;
    };

    const extensionId = req.headers.get("x-extension-id");

    return !!extensionId && !!process.env.EXTENSION_ID && extensionId === process.env.EXTENSION_ID;
};
