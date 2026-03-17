/** US IANA timezone identifiers (50 states, DC, and inhabited territories). */
const US_TIMEZONES = new Set([
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'America/Adak', 'America/Phoenix', 'America/Boise',
  'America/Indiana/Indianapolis', 'America/Indiana/Knox', 'America/Indiana/Marengo',
  'America/Indiana/Petersburg', 'America/Indiana/Tell_City', 'America/Indiana/Vevay',
  'America/Indiana/Vincennes', 'America/Indiana/Winamac',
  'America/Kentucky/Louisville', 'America/Kentucky/Monticello',
  'America/North_Dakota/Beulah', 'America/North_Dakota/Center', 'America/North_Dakota/New_Salem',
  'America/Detroit', 'America/Menominee', 'America/Nome', 'America/Metlakatla',
  'America/Sitka', 'America/Yakutat', 'America/Juneau',
  'Pacific/Honolulu', 'America/Puerto_Rico', 'America/Virgin',
  'Pacific/Guam', 'Pacific/Pago_Pago', 'Pacific/Wake', 'Pacific/Midway', 'Pacific/Saipan',
]);

/**
 * Returns true if the given IANA timezone identifier is a US timezone.
 * Falls back to the browser's system timezone when `tz` is undefined.
 */
export function isUSTimezone(tz?: string): boolean {
  const resolved = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return US_TIMEZONES.has(resolved);
}
