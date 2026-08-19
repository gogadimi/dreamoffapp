// Authentication routes
// POST /register — create new user with hashed password
// POST /login    — validate credentials, return JWT
// GET  /me       — return current user profile (protected)

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js';

const router = Router();
const SALT_ROUNDS = 10;

function generateToken(user: { email: string; name: string }) {
    return jwt.sign(
        { email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// ── Register ──
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        const existing = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existing) {
            return res.status(409).json({ error: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const userToSave = {
            email: email.toLowerCase(),
            name,
            password: hashedPassword
        };

        const dbUser = await User.create(userToSave);

        const token = generateToken(userToSave);
        res.status(201).json({
            token,
            user: { email: dbUser.email, name: dbUser.name, createdAt: dbUser.createdAt }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ── Login ──
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ where: { email: email.toLowerCase() } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = generateToken(user);
        res.json({
            token,
            user: { email: user.email, name: user.name, createdAt: user.createdAt }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ── Get current user (protected) ──
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = await User.findOne({ where: { email: req.user!.email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({
            user: { email: user.email, name: user.name, createdAt: user.createdAt }
        });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
