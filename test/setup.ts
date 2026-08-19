import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Node 25 defines its own `localStorage` global, which shadows jsdom's and is
// inert unless the process was started with --localstorage-file. Replace it
// with a real in-memory Storage so code under test behaves like a browser.
class MemoryStorage implements Storage {
    #entries = new Map<string, string>();

    get length() {
        return this.#entries.size;
    }

    key(index: number): string | null {
        return [...this.#entries.keys()][index] ?? null;
    }

    getItem(key: string): string | null {
        return this.#entries.get(String(key)) ?? null;
    }

    setItem(key: string, value: string): void {
        this.#entries.set(String(key), String(value));
    }

    removeItem(key: string): void {
        this.#entries.delete(String(key));
    }

    clear(): void {
        this.#entries.clear();
    }

    [name: string]: any;
}

const storage = new MemoryStorage();
for (const target of [globalThis, window]) {
    Object.defineProperty(target, 'localStorage', {
        value: storage,
        configurable: true,
        writable: true
    });
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    cleanup();
    localStorage.clear();
});
