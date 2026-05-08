'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  ExternalLink,
  GripVertical,
  Link as LinkIcon,
  MapPin,
  MoreHorizontal,
  Plus,
  Save,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react'
import { EventWithDetails, ItineraryDayWithItems, ItineraryItem } from '@/lib/supabase'
import {
  createItineraryItem,
  deleteItineraryItem,
  getEventItinerary,
  ItineraryItemInput,
  reorderItineraryItems,
  updateItineraryDay,
  updateItineraryItem,
} from '@/lib/itineraryQueries'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n'

const emptyInput: ItineraryItemInput = {
  title: '',
  start_time: '',
  end_time: '',
  place_name: '',
  address: '',
  city: '',
  url: '',
  notes: '',
}

function cleanInput(input: ItineraryItemInput): ItineraryItemInput {
  return {
    title: input.title,
    start_time: input.start_time ?? '',
    end_time: input.end_time ?? '',
    place_name: input.place_name ?? '',
    address: input.address ?? '',
    city: input.city ?? '',
    url: input.url ?? '',
    notes: input.notes ?? '',
  }
}

function formatTimeRange(item: ItineraryItem): string | null {
  if (item.start_time && item.end_time) return `${item.start_time.slice(0, 5)} - ${item.end_time.slice(0, 5)}`
  if (item.start_time) return item.start_time.slice(0, 5)
  return null
}

function normalizeUrl(url: string | null) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function hasExtraDetails(item: ItineraryItem) {
  return Boolean(item.address || item.url || item.notes)
}

function ItineraryItemForm({
  initial,
  onSubmit,
  onCancel,
  saving,
}: {
  initial?: ItineraryItem
  onSubmit: (input: ItineraryItemInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const { t } = useT()
  const [input, setInput] = useState<ItineraryItemInput>(() => initial ? cleanInput({
    title: initial.title,
    start_time: initial.start_time,
    end_time: initial.end_time,
    place_name: initial.place_name,
    address: initial.address,
    city: initial.city,
    url: initial.url,
    notes: initial.notes,
  }) : emptyInput)
  const [showDetails, setShowDetails] = useState(() => Boolean(initial?.end_time || initial?.address || initial?.city || initial?.url || initial?.notes))

  function setField(field: keyof ItineraryItemInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="rounded-lg border border-[#ddd4c8] bg-white p-3 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-[1fr_112px_1fr]">
        <input
          autoFocus
          value={input.title}
          onChange={(event) => setField('title', event.target.value)}
          placeholder={t('itinerary.activity')}
          className="min-h-10 rounded-lg border border-[#e8e0d6] bg-white px-3 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
        />
        <input
          type="time"
          value={input.start_time ?? ''}
          onChange={(event) => setField('start_time', event.target.value)}
          aria-label={t('itinerary.startTime')}
          className="min-h-10 rounded-lg border border-[#e8e0d6] bg-white px-3 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
        />
        <input
          value={input.place_name ?? ''}
          onChange={(event) => setField('place_name', event.target.value)}
          placeholder={t('itinerary.place')}
          className="min-h-10 rounded-lg border border-[#e8e0d6] bg-white px-3 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
        />
      </div>

      {showDetails && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            type="time"
            value={input.end_time ?? ''}
            onChange={(event) => setField('end_time', event.target.value)}
            aria-label={t('itinerary.endTime')}
            className="min-h-10 rounded-lg border border-[#e8e0d6] bg-white px-3 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
          />
          <input
            value={input.city ?? ''}
            onChange={(event) => setField('city', event.target.value)}
            placeholder={t('itinerary.city')}
            className="min-h-10 rounded-lg border border-[#e8e0d6] bg-white px-3 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
          />
          <input
            value={input.address ?? ''}
            onChange={(event) => setField('address', event.target.value)}
            placeholder={t('itinerary.address')}
            className="min-h-10 rounded-lg border border-[#e8e0d6] bg-white px-3 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
          />
          <input
            value={input.url ?? ''}
            onChange={(event) => setField('url', event.target.value)}
            placeholder={t('itinerary.link')}
            className="min-h-10 rounded-lg border border-[#e8e0d6] bg-white px-3 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
          />
          <textarea
            value={input.notes ?? ''}
            onChange={(event) => setField('notes', event.target.value)}
            placeholder={t('itinerary.notes')}
            rows={2}
            className="resize-none rounded-lg border border-[#e8e0d6] bg-white px-3 py-2 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15 sm:col-span-2"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#776956] hover:bg-[#f3efe8]"
        >
          {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showDetails ? t('itinerary.hideDetails') : t('itinerary.moreDetails')}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSubmit(input)}
            disabled={saving || !input.title.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5b4cf5] px-3 py-2 text-xs font-medium text-white hover:bg-[#4a3dd4] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? t('itinerary.saving') : initial ? t('itinerary.save') : t('itinerary.add')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e0d6] bg-white px-3 py-2 text-xs font-medium text-[#776956] hover:bg-[#f3efe8]"
          >
            <X className="h-3.5 w-3.5" />
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

function DayNotesEditor({
  day,
  saving,
  onSave,
  onCancel,
}: {
  day: ItineraryDayWithItems
  saving: boolean
  onSave: (title: string, notes: string) => void
  onCancel: () => void
}) {
  const { t } = useT()
  const [title, setTitle] = useState(day.title ?? '')
  const [notes, setNotes] = useState(day.notes ?? '')

  return (
    <div className="mt-3 rounded-lg border border-[#ddd4c8] bg-white p-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('itinerary.dayFocusPlaceholder')}
        className="min-h-10 w-full rounded-lg border border-[#e8e0d6] bg-white px-3 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={t('itinerary.dayNotesPlaceholder')}
        rows={2}
        className="mt-2 w-full resize-none rounded-lg border border-[#e8e0d6] bg-white px-3 py-2 text-sm outline-none focus:border-[#5b4cf5] focus:ring-2 focus:ring-[#5b4cf5]/15"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onSave(title, notes)}
          disabled={saving}
          className="rounded-lg bg-[#5b4cf5] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {t('itinerary.saveDay')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#e8e0d6] bg-white px-3 py-2 text-xs font-medium text-[#776956]"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

function ItineraryItemRow({
  day,
  item,
  index,
  count,
  canEdit,
  saving,
  editing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onMove,
}: {
  day: ItineraryDayWithItems
  item: ItineraryItem
  index: number
  count: number
  canEdit: boolean
  saving: boolean
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onUpdate: (input: ItineraryItemInput) => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
}) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(false)
  const url = normalizeUrl(item.url)
  const detailCount = [item.address, item.url, item.notes].filter(Boolean).length
  const timeRange = formatTimeRange(item)

  if (editing) {
    return (
      <ItineraryItemForm
        initial={item}
        saving={saving}
        onCancel={onCancelEdit}
        onSubmit={onUpdate}
      />
    )
  }

  return (
    <article className="group rounded-lg border border-transparent bg-white px-3 py-3 transition-colors hover:border-[#e8e0d6]">
      <div className="flex items-start gap-3">
        <div className="w-[76px] flex-shrink-0">
          <span className={`inline-flex max-w-full rounded-md px-2 py-1 text-[11px] font-medium ${item.start_time ? 'bg-[#5b4cf5]/10 text-[#4a3dd4]' : 'bg-[#f3efe8] text-[#776956]'}`}>
            {timeRange ?? t('itinerary.flexible')}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-5 text-[#1a1614]">{item.title}</h3>
          {(item.place_name || item.city) && (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[#776956]">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{[item.place_name, item.city].filter(Boolean).join(', ')}</span>
            </p>
          )}
        </div>

        {canEdit && (
          <div className="flex flex-shrink-0 items-center gap-1 text-[#9c8b75]">
            <GripVertical className="hidden h-4 w-4 opacity-0 group-hover:opacity-60 sm:block" />
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              className="rounded-md p-1 hover:bg-[#f3efe8] hover:text-[#5b4cf5] disabled:opacity-25"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={index === count - 1}
              className="rounded-md p-1 hover:bg-[#f3efe8] hover:text-[#5b4cf5] disabled:opacity-25"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onEdit}
              aria-label={t('common.edit')}
              className="rounded-md p-1 hover:bg-[#f3efe8] hover:text-[#5b4cf5]"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={t('common.delete')}
              className="rounded-md p-1 hover:bg-[#fdf0ea] hover:text-[#c84e32]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {hasExtraDetails(item) && (
        <div className="ml-[88px] mt-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-[#776956] hover:bg-[#f3efe8]"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            {expanded ? t('itinerary.hideDetails') : `${detailCount} ${detailCount === 1 ? t('itinerary.detail') : t('itinerary.details')}`}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 rounded-lg bg-[#faf7f2] p-3 text-xs leading-relaxed text-[#5f5346]">
              {item.address && <p>{item.address}</p>}
              {item.notes && (
                <p className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{item.notes}</span>
                </p>
              )}
              {url && (
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#5b4cf5] hover:underline">
                  <LinkIcon className="h-3.5 w-3.5" />
                  {t('itinerary.openLink')}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export function ItineraryPlanner({ event, canEdit, currentPersonId }: { event: EventWithDetails; canEdit: boolean; currentPersonId: string | null }) {
  const { t } = useT()
  const [days, setDays] = useState<ItineraryDayWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingDayId, setAddingDayId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingDayId, setEditingDayId] = useState<string | null>(null)

  const itemCount = useMemo(() => days.reduce((total, day) => total + day.items.length, 0), [days])

  async function loadItinerary() {
    try {
      setError(null)
      const itinerary = await getEventItinerary(event)
      setDays(itinerary)
    } catch (loadError) {
      console.error('Itinerary load error:', loadError)
      setError(t('itinerary.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    queueMicrotask(async () => {
      if (!active) return
      setLoading(true)
      await loadItinerary()
    })

    const channel = supabase
      .channel(`itinerary-${event.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_itinerary_days', filter: `event_id=eq.${event.id}` }, () => { void loadItinerary() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_itinerary_items' }, () => { void loadItinerary() })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  async function runMutation(action: () => Promise<void>) {
    setSaving(true)
    setError(null)
    try {
      await action()
      await loadItinerary()
    } catch (mutationError) {
      console.error('Itinerary save error:', mutationError)
      setError(t('itinerary.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(dayId: string, input: ItineraryItemInput) {
    const day = days.find((item) => item.id === dayId)
    await runMutation(async () => {
      await createItineraryItem(dayId, input, currentPersonId, day?.items.length ?? 0)
      setAddingDayId(null)
    })
  }

  async function handleUpdate(itemId: string, input: ItineraryItemInput) {
    await runMutation(async () => {
      await updateItineraryItem(itemId, input)
      setEditingItemId(null)
    })
  }

  async function handleDelete(itemId: string) {
    await runMutation(async () => {
      await deleteItineraryItem(itemId)
    })
  }

  async function moveItem(day: ItineraryDayWithItems, item: ItineraryItem, direction: -1 | 1) {
    const index = day.items.findIndex((candidate) => candidate.id === item.id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= day.items.length) return
    const next = [...day.items]
    const [removed] = next.splice(index, 1)
    next.splice(nextIndex, 0, removed)

    await runMutation(async () => {
      await reorderItineraryItems(next)
    })
  }

  async function saveDay(dayId: string, title: string, notes: string) {
    await runMutation(async () => {
      await updateItineraryDay(dayId, {
        title: title.trim() || null,
        notes: notes.trim() || null,
      })
      setEditingDayId(null)
    })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => <div key={item} className="skeleton h-28 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#e8e0d6] bg-white p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#776956]">{t('itinerary.tripPlan')}</p>
            <h2 className="text-lg font-semibold text-[#1a1614]">
              {itemCount === 1
                ? t('itinerary.plannedItem',       { count: itemCount })
                : t('itinerary.plannedItemPlural', { count: itemCount })}
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#f3efe8] px-3 py-2 text-xs font-medium text-[#776956]">
            <CalendarDays className="h-4 w-4" />
            {days.length === 1
              ? t('itinerary.daySingular', { count: days.length })
              : t('itinerary.dayPlural',   { count: days.length })}
          </div>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#f4b7a6] bg-[#fdf0ea] px-3 py-2 text-sm text-[#9b3d27]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {days.map((day, dayIndex) => {
        const timed = day.items.filter((item) => item.start_time)
        const flexible = day.items.filter((item) => !item.start_time)
        const ordered = [...timed, ...flexible]
        const editingDay = editingDayId === day.id

        return (
          <section key={day.id} className="overflow-hidden rounded-xl border border-[#e8e0d6] bg-[#faf7f2]" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
            <div className="border-b border-[#e8e0d6] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#776956]">{t('itinerary.dayLabel', { n: dayIndex + 1 })}</p>
                  <h3 className="mt-0.5 text-base font-semibold text-[#1a1614]">
                    {format(parseISO(day.day_date), 'EEEE, MMM d')}
                  </h3>
                  {day.title && !editingDay && <p className="mt-1 text-sm font-medium text-[#1a1614]">{day.title}</p>}
                </div>
                {canEdit && (
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingDayId(editingDay ? null : day.id)}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-[#776956] hover:bg-[#f3efe8] hover:text-[#1a1614]"
                    >
                      {editingDay ? t('itinerary.closeNote') : t('itinerary.dayNote')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingDayId(day.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#5b4cf5] px-3 py-2 text-xs font-medium text-white hover:bg-[#4a3dd4]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('itinerary.add')}
                    </button>
                  </div>
                )}
              </div>

              {editingDay ? (
                <DayNotesEditor
                  day={day}
                  saving={saving}
                  onCancel={() => setEditingDayId(null)}
                  onSave={(title, notes) => saveDay(day.id, title, notes)}
                />
              ) : (
                day.notes && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#776956]">{day.notes}</p>
                )
              )}
            </div>

            <div className="divide-y divide-[#ebe4db]">
              {addingDayId === day.id && canEdit && (
                <div className="p-3">
                  <ItineraryItemForm
                    saving={saving}
                    onCancel={() => setAddingDayId(null)}
                    onSubmit={(input) => handleCreate(day.id, input)}
                  />
                </div>
              )}

              {ordered.length === 0 ? (
                <div className="flex items-center gap-3 bg-white px-4 py-5 text-sm text-[#776956]">
                  <Clock className="h-4 w-4 flex-shrink-0 text-[#b7a78f]" />
                  <span>{canEdit ? t('itinerary.addFirst') : t('itinerary.noActivities')}</span>
                </div>
              ) : (
                ordered.map((item, itemIndex) => (
                  <ItineraryItemRow
                    key={item.id}
                    day={day}
                    item={item}
                    index={itemIndex}
                    count={ordered.length}
                    canEdit={canEdit}
                    saving={saving}
                    editing={editingItemId === item.id}
                    onEdit={() => setEditingItemId(item.id)}
                    onCancelEdit={() => setEditingItemId(null)}
                    onUpdate={(input) => handleUpdate(item.id, input)}
                    onDelete={() => handleDelete(item.id)}
                    onMove={(direction) => moveItem(day, item, direction)}
                  />
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
