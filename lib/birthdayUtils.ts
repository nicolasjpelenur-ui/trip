import { Person } from '@/lib/supabase'

/**
 * Returns the next occurrence of a person's birthday (today or in the future),
 * or null if the person has no birthday set. Always uses the current calendar
 * year (or next year if the day has already passed this year).
 */
export function nextBirthdayDate(person: Pick<Person, 'birthday'>, today: Date = new Date()): Date | null {
  if (!person.birthday) return null
  const [, monthStr, dayStr] = person.birthday.split('-')
  const month = Number(monthStr) - 1
  const day = Number(dayStr)
  if (Number.isNaN(month) || Number.isNaN(day)) return null

  const candidate = new Date(today.getFullYear(), month, day)
  candidate.setHours(0, 0, 0, 0)
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  if (candidate < t) candidate.setFullYear(t.getFullYear() + 1)
  return candidate
}

/** Days until the next occurrence of this person's birthday (0 = today). */
export function daysUntilBirthday(person: Pick<Person, 'birthday'>, today: Date = new Date()): number | null {
  const next = nextBirthdayDate(person, today)
  if (!next) return null
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  return Math.round((next.getTime() - t.getTime()) / 86_400_000)
}

/** Is this person's birthday today? */
export function isBirthdayToday(person: Pick<Person, 'birthday'>, today: Date = new Date()): boolean {
  return daysUntilBirthday(person, today) === 0
}

/** Is this person's birthday within the next `days` days (inclusive of today)? */
export function isBirthdayWithin(person: Pick<Person, 'birthday'>, days: number, today: Date = new Date()): boolean {
  const d = daysUntilBirthday(person, today)
  return d !== null && d >= 0 && d <= days
}

/** Age the person will turn on their next birthday (or null if year hidden / unknown). */
export function ageOnNextBirthday(person: Pick<Person, 'birthday' | 'show_birthday_year'>, today: Date = new Date()): number | null {
  if (!person.birthday || !person.show_birthday_year) return null
  const next = nextBirthdayDate(person, today)
  if (!next) return null
  const birthYear = Number(person.birthday.split('-')[0])
  if (Number.isNaN(birthYear)) return null
  return next.getFullYear() - birthYear
}

/** Returns the (month, day) part of the date e.g. "Mar 14" — for displaying without year. */
export function formatBirthdayShort(birthday: string | null): string | null {
  if (!birthday) return null
  const [, monthStr, dayStr] = birthday.split('-')
  const month = Number(monthStr) - 1
  const day = Number(dayStr)
  if (Number.isNaN(month) || Number.isNaN(day)) return null
  // Use a fixed reference year so toLocaleDateString works without a real Date
  const d = new Date(2000, month, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
