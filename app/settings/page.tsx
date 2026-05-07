'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, Cake, Database, Download, Eye, EyeOff, Languages, Palette,
  ShieldCheck, Trash2, Type, UserRound,
} from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { PersonAvatar } from '@/components/PersonChip'
import { Person, supabase } from '@/lib/supabase'
import { getPeople, updatePerson, updatePersonStatus } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { useT } from '@/lib/i18n'
import { usePreferences, TextSize } from '@/lib/preferences'
import { exportMyData } from '@/lib/dataExport'
import { clearCurrentPerson } from '@/lib/useCurrentPerson'
import type { Locale } from '@/messages'

const COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#10b981',
  '#3b82f6', '#a855f7', '#ef4444', '#14b8a6',
  '#f59e0b', '#84cc16', '#06b6d4', '#d946ef',
  '#f43f5e', '#22c55e', '#0ea5e9', '#e11d48',
  '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#2563eb', '#9333ea', '#0891b2', '#65a30d',
]

function SectionCard({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[#e8e0d5] p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#5b4cf5]" />
        <h2 className="text-sm font-semibold text-[#1a1614]">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function SettingsContent() {
  const router = useRouter()
  const toast = useToast()
  const { t, locale, setLocale } = useT()
  const prefs = usePreferences()
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [status, setStatus] = useState('')
  const [birthday, setBirthday] = useState('')
  const [showBirthdayYear, setShowBirthdayYear] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pwEmail, setPwEmail] = useState('')
  const [pwPassword, setPwPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    async function load() {
      const id = localStorage.getItem('currentPersonId')
      if (!id) { router.replace('/'); return }
      const people = await getPeople()
      const cp = people.find((p) => p.id === id) ?? null
      if (!cp) { clearCurrentPerson(); router.replace('/'); return }
      setPerson(cp)
      setName(cp.name); setColor(cp.color); setStatus(cp.status ?? '')
      setBirthday(cp.birthday ?? ''); setShowBirthdayYear(cp.show_birthday_year ?? false)
      setPwEmail(cp.email ?? '')
      setLoading(false)
    }
    load()
  }, [router])

  async function saveProfile() {
    if (!person || !name.trim()) return
    setSaving(true)
    try {
      await updatePerson(person.id, {
        name: name.trim(), color,
        birthday: birthday || null, show_birthday_year: showBirthdayYear,
      })
      await updatePersonStatus(person.id, status)
      const updated = { ...person, name: name.trim(), color, status, birthday: birthday || null, show_birthday_year: showBirthdayYear }
      setPerson(updated)
      localStorage.setItem('currentPersonName', updated.name)
      window.dispatchEvent(new CustomEvent('personUpdated', { detail: { name: updated.name, color: updated.color } }))
      toast.show(t('settings.profile.saved'))
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function setPassword() {
    if (!person || !pwEmail.trim() || pwPassword.length < 6) {
      setPwError('Email + password (min 6 chars) required.'); return
    }
    setPwSaving(true); setPwError('')
    const { data, error } = await supabase.auth.signUp({ email: pwEmail.trim(), password: pwPassword })
    if (error) { setPwError(error.message); setPwSaving(false); return }
    if (data.user) {
      const { error: updateError } = await supabase
        .from('people').update({ auth_user_id: data.user.id, email: pwEmail.trim() }).eq('id', person.id)
      if (updateError) setPwError(updateError.message)
      else { setPerson({ ...person, auth_user_id: data.user.id, email: pwEmail.trim() }); setPwDone(true); setPwPassword('') }
    }
    setPwSaving(false)
  }

  async function handleExport() {
    if (!person) return
    setExporting(true)
    try {
      const result = await exportMyData(person.id)
      toast.show(`Downloaded ${result.filename}`)
    } catch {
      toast.show('Could not export data.', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function deleteAccount() {
    if (!person) return
    setDeleting(true); setDeleteError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({ personId: person.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not delete account.')
      await supabase.auth.signOut()
      clearCurrentPerson()
      router.replace('/'); router.refresh()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete account.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <div className="skeleton h-6 w-24 rounded" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    )
  }
  if (!person) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[#1a1614]">{t('settings.title')}</h1>
        <p className="text-sm text-[#9c8b75] mt-0.5">{t('settings.subtitle')}</p>
      </header>

      {/* Profile */}
      <SectionCard icon={UserRound} title={t('settings.sections.profile')}>
        <div className="flex items-center gap-3">
          <PersonAvatar person={{ ...person, name, color, status }} size="lg" />
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[#9c8b75] mb-1">{t('settings.profile.name')}</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#e8e0d5] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2]"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#9c8b75] mb-1">{t('settings.profile.status')}</label>
          <input
            type="text" placeholder={t('settings.profile.statusPlaceholder')} value={status}
            onChange={(e) => setStatus(e.target.value)} maxLength={60}
            className="w-full border border-[#e8e0d5] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2]"
          />
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#9c8b75] mb-2">
            <Palette className="w-3.5 h-3.5" /> {t('settings.profile.color')}
          </p>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((item) => (
              <button
                key={item} type="button" onClick={() => setColor(item)} aria-label={`Choose ${item}`}
                className={`w-7 h-7 rounded-full transition-all ${color === item ? 'scale-125 ring-2 ring-offset-1 ring-[#9c8b75]' : 'hover:scale-110'}`}
                style={{ backgroundColor: item }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#9c8b75] mb-1">
            <Cake className="w-3.5 h-3.5" /> {t('settings.profile.birthday')}{' '}
            <span className="font-normal text-[#c9b99f]">({t('settings.profile.birthdayHint')})</span>
          </label>
          <div className="flex gap-2">
            <input
              type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
              className="flex-1 border border-[#e8e0d5] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2] text-[#1a1614]"
            />
            {birthday && (
              <button type="button" onClick={() => setBirthday('')} className="text-xs text-[#9c8b75] hover:text-[#1a1614] px-2">
                {t('common.cancel')}
              </button>
            )}
          </div>
          {birthday && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={showBirthdayYear} onChange={(e) => setShowBirthdayYear(e.target.checked)}
                className="rounded border-[#e8e0d5] accent-[#5b4cf5]" />
              <span className="text-xs text-[#6b5d4f]">{t('settings.profile.showAge')}</span>
            </label>
          )}
        </div>
        <button
          onClick={saveProfile} disabled={saving || !name.trim()}
          className="bg-[#5b4cf5] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
        >
          {saving ? t('common.saving') : t('settings.profile.saveProfile')}
        </button>
      </SectionCard>

      {/* Preferences */}
      <SectionCard icon={Languages} title={t('settings.sections.preferences')}>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#9c8b75] mb-2">
            <Languages className="w-3.5 h-3.5" /> {t('settings.preferences.language')}
          </p>
          <div className="flex gap-2">
            {(['en', 'es'] as Locale[]).map((l) => (
              <button
                key={l} onClick={() => setLocale(l)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                  locale === l ? 'bg-[#5b4cf5] text-white border-[#5b4cf5]' : 'bg-white text-[#1a1614] border-[#e8e0d5] hover:bg-[#f3efe8]'
                }`}
              >
                {l === 'en' ? t('settings.preferences.english') : t('settings.preferences.spanish')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#9c8b75] mb-2">
            <Type className="w-3.5 h-3.5" /> {t('settings.preferences.textSize')}
          </p>
          <div className="flex gap-2">
            {(['cozy', 'default', 'larger'] as TextSize[]).map((sz) => (
              <button
                key={sz} onClick={() => prefs.setTextSize(sz)}
                className={`flex-1 py-2 rounded-xl font-medium transition-all border ${
                  prefs.textSize === sz ? 'bg-[#5b4cf5] text-white border-[#5b4cf5]' : 'bg-white text-[#1a1614] border-[#e8e0d5] hover:bg-[#f3efe8]'
                }`}
                style={{ fontSize: sz === 'cozy' ? '12px' : sz === 'larger' ? '15px' : '13px' }}
              >
                {t(`settings.preferences.textSizeOptions.${sz}`)}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard icon={Bell} title={t('settings.sections.notifications')}>
        {(['birthdays', 'trips', 'messages', 'polls'] as const).map((cat) => (
          <label key={cat} className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-[#1a1614]">{t(`settings.notifications.categories.${cat}`)}</span>
            <button
              type="button"
              onClick={() => prefs.setNotificationPref(cat, !prefs.notifications[cat])}
              className={`w-10 h-5.5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${
                prefs.notifications[cat] ? 'bg-[#5b4cf5]' : 'bg-[#e8e0d5]'
              }`}
              style={{ height: 22 }}
            >
              <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${prefs.notifications[cat] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
        ))}
        <p className="text-[11px] text-[#9c8b75] pt-1">
          {t('settings.notifications.installFirst')}
        </p>
      </SectionCard>

      {/* Privacy & data */}
      <SectionCard icon={ShieldCheck} title={t('settings.sections.privacy')}>
        {/* Password */}
        <div>
          <p className="text-xs font-semibold text-[#1a1614] mb-2">{t('settings.privacy.passwordTitle')}</p>
          {person.auth_user_id || pwDone ? (
            <p className="text-xs text-green-600 font-medium">{t('settings.privacy.passwordIsSet')}</p>
          ) : (
            <div className="space-y-2">
              <input
                type="email" placeholder={t('settings.privacy.email')} value={pwEmail}
                onChange={(e) => setPwEmail(e.target.value)}
                className="w-full border border-[#e8e0d5] rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2]"
              />
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} placeholder={t('settings.privacy.newPassword')}
                  value={pwPassword} onChange={(e) => setPwPassword(e.target.value)}
                  className="w-full border border-[#e8e0d5] rounded-xl px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2]"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9c8b75]">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {pwError && <p className="text-[11px] text-red-500">{pwError}</p>}
              <button
                onClick={setPassword} disabled={pwSaving || !pwEmail || pwPassword.length < 6}
                className="text-xs font-medium text-[#5b4cf5] border border-[#5b4cf5]/30 px-3 py-1.5 rounded-xl hover:bg-[#5b4cf5]/5 disabled:opacity-40 transition-colors"
              >
                {pwSaving ? t('settings.privacy.setting') : t('settings.privacy.setPassword')}
              </button>
            </div>
          )}
        </div>

        {/* Data export */}
        <div className="pt-3 border-t border-[#e8e0d5]">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1a1614] mb-1">
            <Database className="w-3.5 h-3.5" /> {t('settings.privacy.exportTitle')}
          </p>
          <p className="text-[11px] text-[#9c8b75] mb-2">{t('settings.privacy.exportSubtitle')}</p>
          <button
            onClick={handleExport} disabled={exporting}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5b4cf5] border border-[#5b4cf5]/30 px-3 py-1.5 rounded-xl hover:bg-[#5b4cf5]/5 disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? t('common.loading') : t('settings.privacy.exportButton')}
          </button>
        </div>

        {/* Delete */}
        <div className="pt-3 border-t border-[#e8e0d5]">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1a1614] mb-2">
            <Trash2 className="w-3.5 h-3.5 text-red-500" /> {t('settings.privacy.deleteTitle')}
          </p>
          {confirmDelete ? (
            <div className="space-y-3 rounded-xl bg-red-50 p-3">
              <p className="text-xs text-red-600">{t('settings.privacy.deleteHint')}</p>
              {deleteError && <p className="text-xs text-red-700">{deleteError}</p>}
              <div className="flex gap-2">
                <button onClick={deleteAccount} disabled={deleting}
                  className="text-xs font-medium text-white bg-red-500 px-3 py-1.5 rounded-xl disabled:opacity-40">
                  {deleting ? t('settings.privacy.deleting') : t('settings.privacy.deleteConfirm')}
                </button>
                <button onClick={() => { setConfirmDelete(false); setDeleteError('') }} className="text-xs text-[#9c8b75] px-3 py-1.5">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-600 transition-colors">
              {t('settings.privacy.deleteAction')}
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf7f2]">
        <NavBar />
        <SettingsContent />
      </div>
    </RealtimeProvider>
  )
}
