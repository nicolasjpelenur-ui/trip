'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPeople, getLocations, createLocation, createEvent, updateEvent, deleteEvent } from '@/lib/queries'
import { Person, Location, EventWithDetails } from '@/lib/supabase'
import { PersonDot } from './PersonChip'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface EventFormProps {
  existing?: EventWithDetails
  defaultDate?: string
}

export function EventForm({ existing, defaultDate }: EventFormProps) {
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [locationId, setLocationId] = useState(existing?.location_id ?? '')
  const [startDate, setStartDate] = useState(existing?.start_date ?? defaultDate ?? '')
  const [endDate, setEndDate] = useState(existing?.end_date ?? defaultDate ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(
    new Set(existing?.participants.map((p) => p.person_id) ?? [])
  )
  const [apartmentPeople, setApartmentPeople] = useState<Set<string>>(
    new Set(existing?.participants.filter((p) => p.staying_at_apartment).map((p) => p.person_id) ?? [])
  )

  const [newLocationName, setNewLocationName] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)

  useEffect(() => {
    Promise.all([getPeople(), getLocations()]).then(([p, l]) => {
      setPeople(p)
      setLocations(l)
      if (!existing && l.length > 0) setLocationId(l[0].id)
      setLoading(false)
    })
  }, [existing])

  function togglePerson(id: string) {
    setSelectedPeople((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleApartment(id: string) {
    setApartmentPeople((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleAddLocation() {
    if (!newLocationName.trim()) return
    const loc = await createLocation({ name: newLocationName.trim(), emoji: '📍' })
    setLocations((prev) => [...prev, loc])
    setLocationId(loc.id)
    setNewLocationName('')
    setAddingLocation(false)
  }

  async function handleSave() {
    if (!title.trim() || !locationId || !startDate || !endDate) return
    setSaving(true)
    const currentPersonId = localStorage.getItem('currentPersonId') ?? undefined
    const payload = { title: title.trim(), location_id: locationId, start_date: startDate, end_date: endDate, notes: notes || undefined, created_by: currentPersonId }

    if (existing) {
      await updateEvent(existing.id, payload, Array.from(selectedPeople), Array.from(apartmentPeople))
    } else {
      await createEvent(payload, Array.from(selectedPeople), Array.from(apartmentPeople))
    }
    router.push('/calendar')
  }

  async function handleDelete() {
    if (!existing) return
    setDeleting(true)
    await deleteEvent(existing.id)
    router.push('/calendar')
  }

  const selectedLocation = locations.find((l) => l.id === locationId)
  const isValencia = selectedLocation?.name.toLowerCase() === 'valencia'

  if (loading) return <div className="text-center text-gray-400 py-8">Loading...</div>

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Event title</label>
        <input
          type="text"
          placeholder="e.g. Mum visits Valencia"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Location */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Location</label>
        <div className="flex gap-2">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>
            ))}
          </select>
          {!addingLocation && (
            <button
              onClick={() => setAddingLocation(true)}
              className="text-indigo-600 text-sm px-2 hover:underline"
            >
              + New
            </button>
          )}
        </div>
        {addingLocation && (
          <div className="flex gap-2 mt-2">
            <input
              autoFocus
              type="text"
              placeholder="Location name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button size="sm" onClick={handleAddLocation}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => setAddingLocation(false)}>Cancel</Button>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Participants */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Who&apos;s involved?</label>
        <div className="space-y-1.5">
          {people.map((p) => {
            const checked = selectedPeople.has(p.id)
            return (
              <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePerson(p.id)}
                  className="rounded"
                />
                <PersonDot color={p.color} />
                <span className="text-sm text-gray-800 flex-1">{p.name}</span>
                {isValencia && checked && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={apartmentPeople.has(p.id)}
                      onChange={() => toggleApartment(p.id)}
                      className="rounded"
                    />
                    Staying at apartment
                  </label>
                )}
              </label>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
        <Textarea
          placeholder="Flight info, address, anything useful..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={!title.trim() || !locationId || !startDate || !endDate || saving}
          className="flex-1"
        >
          {saving ? 'Saving...' : existing ? 'Save changes' : 'Create event'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        {existing && (
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            {deleting ? '...' : 'Delete'}
          </Button>
        )}
      </div>
    </div>
  )
}
