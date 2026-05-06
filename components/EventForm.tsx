'use client'

import { useState, useEffect } from 'react'
import { createElement } from 'react'
import { useRouter } from 'next/navigation'
import { getPeople, getLocations, createLocation, createEvent, updateEvent, deleteEvent, logActivity } from '@/lib/queries'
import { Person, Location, EventWithDetails } from '@/lib/supabase'
import { PersonAvatar } from './PersonChip'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getLocationIcon, LOCATION_ICON_OPTIONS } from '@/lib/locationIcons'
import { Eye, EyeOff } from 'lucide-react'

interface EventFormProps {
  existing?: EventWithDetails
  defaultDate?: string
  defaultEndDate?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function EventForm({ existing, defaultDate, defaultEndDate, onSuccess, onCancel }: EventFormProps) {
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
  const [endDate, setEndDate] = useState(existing?.end_date ?? defaultEndDate ?? defaultDate ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(
    new Set(existing?.participants.map((p) => p.person_id) ?? [])
  )
  const [apartmentPeople, setApartmentPeople] = useState<Set<string>>(
    new Set(existing?.participants.filter((p) => p.staying_at_apartment).map((p) => p.person_id) ?? [])
  )
  const [visibility, setVisibility] = useState<'all' | 'selected'>(
    (existing?.visibility as 'all' | 'selected') ?? 'all'
  )
  const [viewerIds, setViewerIds] = useState<Set<string>>(
    new Set(existing?.viewers.map((v) => v.person_id) ?? [])
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

  function toggleViewer(id: string) {
    setViewerIds((prev) => {
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
      visibility,
    }
    const viewers = visibility === 'selected' ? Array.from(viewerIds) : []

    try {
      if (existing) {
        await updateEvent(existing.id, payload, Array.from(selectedPeople), Array.from(apartmentPeople), viewers)
        logActivity(currentPersonId ?? null, 'updated_event', title.trim(), 'event', existing.id)
      } else {
        const created = await createEvent(payload, Array.from(selectedPeople), Array.from(apartmentPeople), viewers)
        logActivity(currentPersonId ?? null, 'created_event', title.trim(), 'event', created.id)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/calendar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existing) return
    setDeleting(true)
    const currentPersonId = localStorage.getItem('currentPersonId')
    try {
      await deleteEvent(existing.id)
      logActivity(currentPersonId ?? null, 'deleted_event', existing.title, 'event', existing.id)
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/calendar')
      }
    } finally {
      setDeleting(false)
    }
  }

  function handleCancel() {
    if (onCancel) onCancel()
    else router.back()
  }

  const selectedLocation = locations.find((l) => l.id === locationId)
  const isValencia = selectedLocation?.name.toLowerCase() === 'valencia'

  if (loading) return <div className="text-center text-[#9c8b75] py-8 text-sm">Loading…</div>

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label className="text-xs font-medium text-[#9c8b75] block mb-1.5">Title</label>
        <input
          type="text"
          placeholder="e.g. Mum visits Valencia"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 focus:border-[#5b4cf5] bg-[#faf7f2]"
        />
      </div>

      {/* Location */}
      <div>
        <label className="text-xs font-medium text-[#9c8b75] block mb-1.5">Location</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            {selectedLocation && (
              createElement(getLocationIcon(selectedLocation.emoji), {
                className: 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9c8b75] pointer-events-none',
              })
            )}
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-white appearance-none text-[#1a1614]"
              style={{ paddingLeft: selectedLocation ? '2rem' : '0.875rem' }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          {!addingLocation && (
            <button
              onClick={() => setAddingLocation(true)}
              className="text-xs text-[#5b4cf5] border border-dashed border-[#5b4cf5]/30 rounded-xl px-3 hover:bg-[#5b4cf5]/5 transition-colors whitespace-nowrap"
            >
              + New place
            </button>
          )}
        </div>

        {addingLocation && (
          <div className="mt-2 p-3 bg-[#f3efe8] rounded-xl space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Place name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              className="w-full border border-[#ede8e0] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-white"
            />
            <div className="flex gap-1.5 flex-wrap">
              {LOCATION_ICON_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setNewLocationIcon(key)}
                  title={label}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    newLocationIcon === key ? 'bg-[#5b4cf5] text-white' : 'bg-white border border-[#ede8e0] text-[#9c8b75] hover:bg-[#f3efe8]'
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
          <label className="text-xs font-medium text-[#9c8b75] block mb-1.5">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value) }}
            className="w-full border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2] text-[#1a1614]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[#9c8b75] block mb-1.5">To</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2] text-[#1a1614]"
          />
        </div>
      </div>

      {/* Participants */}
      <div>
        <label className="text-xs font-medium text-[#9c8b75] block mb-2">Who is going?</label>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => {
            const checked = selectedPeople.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => togglePerson(p.id)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: checked ? p.color : '#f3efe8',
                  color: checked ? 'white' : '#9c8b75',
                }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: checked ? 'rgba(255,255,255,0.3)' : '#ede8e0', color: checked ? 'white' : '#9c8b75' }}>
                  {p.name.charAt(0)}
                </span>
                {p.name.split(' ')[0]}
              </button>
            )
          })}
        </div>

        {isValencia && selectedPeople.size > 0 && (
          <div className="mt-3 p-3 bg-[#5b4cf5]/5 rounded-xl border border-[#5b4cf5]/10">
            <p className="text-xs font-medium text-[#5b4cf5] mb-2">Staying at the apartment?</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedPeople).map((id) => {
                const p = people.find((x) => x.id === id)
                if (!p) return null
                const inApt = apartmentPeople.has(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleApartment(id)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: inApt ? '#5b4cf5' : '#f3efe8',
                      color: inApt ? 'white' : '#9c8b75',
                    }}
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

      {/* Visibility */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[#9c8b75] flex items-center gap-1.5">
            {visibility === 'all' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Who can see this event?
          </label>
          <div className="flex items-center bg-[#f3efe8] rounded-full p-0.5">
            {(['all', 'selected'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${visibility === v ? 'bg-white text-[#1a1614] shadow-sm' : 'text-[#9c8b75]'}`}
              >
                {v === 'all' ? 'Everyone' : 'Selected'}
              </button>
            ))}
          </div>
        </div>
        {visibility === 'selected' && (
          <div className="flex flex-wrap gap-2 p-3 bg-[#f3efe8] rounded-xl">
            {people.map((p) => {
              const sel = viewerIds.has(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggleViewer(p.id)}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
                  style={{
                    backgroundColor: sel ? p.color : 'white',
                    color: sel ? 'white' : '#9c8b75',
                    border: `1px solid ${sel ? p.color : '#ede8e0'}`,
                  }}
                >
                  {p.name.split(' ')[0]}
                </button>
              )
            })}
            <p className="w-full text-[10px] text-[#9c8b75] mt-1">Only selected people will see this on their calendar.</p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-[#9c8b75] block mb-1.5">Notes</label>
        <Textarea
          placeholder="Flight info, address, anything useful..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-xl resize-none border-[#ede8e0] bg-[#faf7f2] focus:ring-[#5b4cf5]/30 focus:border-[#5b4cf5] text-[#1a1614]"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={!title.trim() || !locationId || !startDate || !endDate || saving}
          className="flex-1 bg-[#5b4cf5] hover:bg-[#4a3dd4]"
        >
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Create event'}
        </Button>
        <Button variant="outline" onClick={handleCancel} className="border-[#ede8e0] text-[#9c8b75]">Cancel</Button>
      </div>

      {existing && (
        <div className="pt-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl">
              <span className="text-sm text-red-600 flex-1">Delete this event?</span>
              <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}
                className="text-red-600 border-red-200 hover:bg-red-100">
                {deleting ? '…' : 'Yes, delete'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full text-sm text-red-400 hover:text-red-600 py-2 transition-colors">
              Delete event
            </button>
          )}
        </div>
      )}
    </div>
  )
}
