
/**
 * Utility functions for handling UUID fields in forms
 */

/**
 * Converts empty string to null for UUID fields
 * PostgreSQL requires UUID fields to be either valid UUIDs or null, not empty strings
 */
export function sanitizeUuidField(value: string | undefined | null): string | null {
  if (!value || value.trim() === '') {
    return null;
  }
  return value;
}

/**
 * Sanitizes multiple UUID fields in an object
 */
export function sanitizeUuidFields<T extends Record<string, any>>(
  data: T,
  uuidFields: (keyof T)[]
): T {
  const sanitized = { ...data };
  
  for (const field of uuidFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeUuidField(sanitized[field] as string) as T[keyof T];
    }
  }
  
  return sanitized;
}

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates UUID field - returns true if null or valid UUID
 */
export function isValidUuidField(value: string | null | undefined): boolean {
  if (!value || value === null) return true;
  return isValidUUID(value);
}
