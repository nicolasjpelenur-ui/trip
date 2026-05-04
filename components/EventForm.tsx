'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPeople, getLocations, createLocation, createEvent, updateEvent, deleteEvent } from '@/lib/queries'
import { Person, Location, EventWithDetails } from '@/lib/supabase'
import { PersonAvatar } from './PersonChip'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getLocationIcon, LOCATION_ICON_OPTIONS } from '@/lib/locationIcons'

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
  const [confirmDelete, setConfirmDelete] = useState(false)

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
  const [newLocationIcon, setNewLocationIcon] = useState('map-pin')
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
    const loc = await createLocation({ name: newLocationName.trim(), emoji: newLocationIcon })
    setLocations((prev) => [...prev, loc])
    setLocationId(loc.id)
    setNewLocationName('')
    setAddingLocation(false)
  }

  async function handleSave() {
    if (!title.trim() || !locationId || !startDate || !endDate) return
    setSaving(true)
    const currentPersonId = localStorage.getItem('currentPersonId') ?? undefined
    const payload = {
      title: title.trim(),
      location_id: locationId,
      start_date: startDate,
      end_date: endDate,
      notes: notes || undefined,
      created_by: currentPersonId,
    }

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
  const SelectedLocIcon = selectedLocation ? getLocationIcon(selectedLocation.emoji) : null

  if (loading) return <div className="text-center text-gray-400 py-8">Loading...</div>

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Title</label>
        <input
          type="text"
          placeholder="e.g. Mum visits Valencia"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Location */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Location</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            {SelectedLocIcon && (
              <SelectedLocIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            )}
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none"
              style={{ paddingLeft: SelectedLocIcon ? '2rem' : '0.875rem' }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          {!addingLocation && (
            <button
              onClick={() => setAddingLocation(true)}
              className="text-xs text-indigo-600 border border-dashed border-indigo-300 rounded-xl px-3 hover:bg-indigo-50 transition-colors whitespace-nowrap"
            >
              + New place
            </button>
          )}
        </div>

        {addingLocation && (
          <div className="mt-2 p-3 bg-gray-50 rounded-xl space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Place name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <div className="flex gap-1.5 flex-wrap">
              {LOCATION_ICON_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setNewLocationIcon(key)}
                  title={label}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    newLocationIcon === key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddLocation} disabled={!newLocationName.trim()}>Add place</Button>
              <Button size="sm" variant="outline" onClick={() => setAddingLocation(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value) }}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">To</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Participants */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Who is going?</label>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => {
            const checked = selectedPeople.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => togglePerson(p.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                  checked
                    ? 'border-transparent text-white'
                    : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                }`}
                style={{ backgroundColor: checked ? p.color : undefined }}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${checked ? 'bg-white/30' : 'bg-gray-200 text-gray-500'}`}
                  style={{ color: checked ? p.color : undefined }}>
                  {p.name.charAt(0)}
                </span>
                {p.name.split(' ')[0]}
              </button>
            )
          })}
        </div>

        {isValencia && selectedPeople.size > 0 && (
          <div className="mt-3 p-3 bg-indigo-50 rounded-xl">
            <p className="text-xs font-medium text-indigo-700 mb-2">Staying at the apartment?</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedPeople).map((id) => {
                const p = people.find((x) => x.id === id)
                if (!p) return null
                const inApt = apartmentPeople.has(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleApartment(id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      inApt ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
                    }`}
                  >
                    <PersonAvatar person={p} size="sm" />
                    {p.name.split(' ')[0]}
                    {inApt && ' ✓'}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Notes</label>
        <Textarea
          placeholder="Flight info, address, anything useful..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-xl resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={!title.trim() || !locationId || !startDate || !endDate || saving}
          className="flex-1"
        >
          {saving ? 'Saving...' : existing ? 'Save changes' : 'Create event'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      {existing && (
        <div className="pt-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl">
              <span className="text-sm text-red-600 flex-1">Delete this event?</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 border-red-200 hover:bg-red-100"
              >
                {deleting ? '...' : 'Yes, delete'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full text-sm text-red-400 hover:text-red-600 py-2 transition-colors"
            >
              Delete event
            </button>
          )}
        </div>
      )}
    </div>
  )
}
