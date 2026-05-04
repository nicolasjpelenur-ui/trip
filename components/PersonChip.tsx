import { Person } from '@/lib/supabase'

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

export function PersonDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}
