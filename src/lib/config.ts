/**
 * Centralized API Configuration
 *
 * All external API endpoints are referenced here.
 * Uses NEXT_PUBLIC_API_BASE_URL from .env.local with a hardcoded fallback.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const API = {
    CREATE_ORDER: `${API_BASE_URL}/api/checkout`,
    SUBMIT_FEEDBACK: `${API_BASE_URL}/api/feedback`,
} as const;
