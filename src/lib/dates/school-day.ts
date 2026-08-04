/** School calendar "today" as YYYY-MM-DD in a given IANA timezone. */
export function schoolToday(
  timeZone = process.env.BEACON_SCHOOL_TZ || 'America/Chicago'
): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return fmt.format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}
