// URL scheme, in one place.
//
// Screens still speak in screen names via onNavigate, which keeps them
// router-agnostic and testable on their own. This module is the single
// translation layer between those names and real paths.

import { ScreenName } from './types/index';

export const paths = {
    login: '/login',
    home: '/',
    add: (mode: 'record' | 'write' = 'write') => `/add/${mode}`,
    archive: '/archive',
    models: '/models',
    detail: (id: string) => `/dream/${encodeURIComponent(id)}`,
    profile: '/profile'
} as const;

/** Maps an onNavigate(screen, params) call onto a path. */
export function pathFor(screen: ScreenName | string, params?: unknown): string {
    switch (screen) {
        case 'home':
            return paths.home;
        case 'add':
            return paths.add(params === 'record' ? 'record' : 'write');
        case 'archive':
            return paths.archive;
        case 'models':
            return paths.models;
        case 'detail':
            // Without an id there is nothing to show; the archive is the
            // sensible place to land rather than a broken detail route.
            return typeof params === 'string' && params ? paths.detail(params) : paths.archive;
        case 'profile':
            return paths.profile;
        default:
            return paths.home;
    }
}

/**
 * Which bottom-nav item should look active for a given path.
 * /add/record and /add/write both light up "add"; unknown paths light nothing.
 */
export function activeScreen(pathname: string): ScreenName | null {
    if (pathname === paths.home) return 'home';
    if (pathname.startsWith('/add')) return 'add';
    if (pathname.startsWith('/archive')) return 'archive';
    if (pathname.startsWith('/models')) return 'models';
    if (pathname.startsWith('/dream/')) return 'detail';
    if (pathname.startsWith('/profile')) return 'profile';
    return null;
}
