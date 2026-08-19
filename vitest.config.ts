import { defineConfig } from 'vitest/config';

// Suite definitions live in vitest.workspace.ts; this file holds settings
// shared by every project.
export default defineConfig({
    test: {
        globals: true
    }
});
