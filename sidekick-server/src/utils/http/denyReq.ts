import { Response } from "express";

export const deny = (res: Response) => {
    res.status(403)
        .type('application/xml')
        .send(
            `<?xml version="1.0" encoding="UTF-8"?>
                    <error>
                        <message>forbidden</message>
                    </error>`
        );
};