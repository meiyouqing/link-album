/**
 * Environment utilities for Link Album on Netlify
 * This utility handles the preference for NETLIFY_DATABASE_URL over DATABASE_URL
 */

/**
 * Get the database URL, preferring NETLIFY_DATABASE_URL if available
 */
export function getDatabaseUrl(): string | undefined {
  return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
}

/**
 * Check if the database is PostgreSQL based on the connection string
 */
export function isPostgresEnabled(): boolean {
  return getDatabaseUrl()?.startsWith("postgresql") ?? false;
}
