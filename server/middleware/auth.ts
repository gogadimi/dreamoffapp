// JWT authentication middleware
// Extracts Bearer token from Authorization header and verifies it

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET) as Express.UserClaims;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
}
