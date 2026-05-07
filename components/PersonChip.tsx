import { Person } from '@/lib/supabase'
import { isBirthdayWithin } from '@/lib/birthdayUtils'

interface PersonChipProps {
  person: Person
  small?: boolean
}

export function PersonChip({ person, small = false }: PersonChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-white truncate max-w-full ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}`}
      style={{ backgroundColor: person.color }}
    >
      {person.name}
    </span>
  )
}

export function PersonAvatar({
  person,
  size = 'md',
  active = true,
  traveling = false,
}: {
  person: Person
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  traveling?: boolean
}) {
  const initial = person.name.charAt(0).toUpperCase()
  const dims = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-xs'
  const isBirthdayWeek = isBirthdayWithin(person, 7)
  const ringClass = isBirthdayWeek ? 'birthday-halo' : traveling ? 'traveling-glow' : ''
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 transition-opacity ${dims} ${active ? 'opacity-100' : 'opacity-30'} ${ringClass}`}
      style={{ backgroundColor: person.color }}
      title={isBirthdayWeek ? `${person.name} (birthday this week)` : person.name}
    >
      {initial}
    </span>
  )
}

export function PersonDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}
