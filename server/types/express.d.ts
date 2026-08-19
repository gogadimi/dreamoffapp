// Declaration merging so `req.user` is typed everywhere instead of each route
// widening its handler to `req: any` to reach it.

import 'express';

declare global {
    namespace Express {
        /** Claims carried by the JWT issued in routes/auth.ts. */
        interface UserClaims {
            email: string;
            name: string;
            iat?: number;
            exp?: number;
        }

        interface Request {
            /** Set by authenticateToken; present on any route behind it. */
            user?: UserClaims;
        }
    }
}

export {};
