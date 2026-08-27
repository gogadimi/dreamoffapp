import { defineWorkspace } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Two suites in one run: browser-shaped tests for the React app, node-shaped
// tests for the Express/Sequelize server.
export default defineWorkspace([
    {
        plugins: [react()],
        test: {
            name: 'frontend',
            environment: 'jsdom',
            globals: true,
            include: ['src/**/*.test.{ts,tsx}'],
            setupFiles: ['./test/setup.ts']
        }
    },
    {
        resolve: {
            // Server sources use NodeNext-style "./db.js" specifiers that point
            // at .ts files. Vite does not remap those on its own.
            extensions: ['.ts', '.js', '.json']
        },
        test: {
            name: 'server',
            environment: 'node',
            globals: true,
            include: ['server/**/*.test.ts'],
            setupFiles: ['./test/server-setup.ts'],
            // Each test file gets its own temp database and uploads directory
            // from test/server-setup.ts, so files are already isolated from one
            // another and can run in parallel.
        }
    }
]);
