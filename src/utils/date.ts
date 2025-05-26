/**
 * Handle converting the Date object into an ISO8601 compliant
 * string.
 *
 * Calling this function for a string will just pass it through,
 * as this is used to normalise Date objects before sending
 * to the remote API.
 *
 * @param date the date we want to convert.
 *
 * @returns the converted Date string.
 */
export function toDateString(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }

  return date;
}
