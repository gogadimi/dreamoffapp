// Dream API client.
//
// Built on apiFetch so the Bearer header, the non-JSON response handling and
// the 401 auto-logout live in exactly one place. This module used to
// reimplement all three, three times over.

import { apiFetch } from './authApi';
import { Dream } from '../types/index';

const API_BASE = '/api/dreams';

export async function fetchDreams(): Promise<Dream[]> {
    return apiFetch(API_BASE);
}

export async function createDream(dreamData: Partial<Dream>): Promise<Dream> {
    return apiFetch(API_BASE, {
        method: 'POST',
        body: JSON.stringify(dreamData)
    });
}

export async function deleteDreamApi(id: string): Promise<{ success: boolean; id: string }> {
    return apiFetch(`${API_BASE}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
}
