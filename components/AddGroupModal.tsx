'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddGroupModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [participants, setParticipants] = useState([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const MAX_EXTRA = 3

  function updateParticipant(index: number, value: string) {
    const updated = [...participants]
    updated[index] = value
    setParticipants(updated)
  }

  function addParticipantSlot() {
    if (participants.length < MAX_EXTRA) {
      setParticipants([...participants, ''])
    }
  }

  function removeParticipant(index: number) {
    const updated = participants.filter((_, i) => i !== index)
    setParticipants(updated.length === 0 ? [''] : updated)
  }

  async function handleCreate() {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert([{ name: groupName.trim(), owner_id: user.id }])
      .select()
      .single()

    if (groupError) {
      setError(groupError.message)
      setLoading(false)
      return
    }

    const allParticipants = [
      { group_id: group.id, name: 'You (Owner)' },
      ...participants
        .filter(p => p.trim() !== '')
        .map(name => ({ group_id: group.id, name: name.trim() }))
    ]

    const { error: partError } = await supabase
      .from('participants')
      .insert(allParticipants)

    if (partError) {
      setError(partError.message)
      setLoading(false)
      return
    }

    // Reset and close
    setOpen(false)
    setGroupName('')
    setParticipants([''])
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all text-white font-semibold px-5 py-3 rounded-2xl text-sm cursor-pointer"
      >
        <span>+</span>
        <span>Add Group</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 border-b border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900">New Group</h2>
              <p className="text-zinc-600 text-sm mt-1">
                Create a group and add participants
              </p>
            </div>

            <div className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
                  {error}
                </div>
              )}

              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Goa Trip, House Rent"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 transition-all placeholder:text-zinc-400"
                />
              </div>

              {/* Participants */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-3">
                  Participants
                </label>

                {/* Owner */}
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-100 rounded-2xl mb-3">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="font-medium text-zinc-900">You (Owner)</p>
                    <p className="text-xs text-zinc-500">Automatically added</p>
                  </div>
                </div>

                {/* Additional Participants */}
                {participants.map((p, i) => (
                  <div key={i} className="flex gap-3 mb-3">
                    <input
                      type="text"
                      placeholder={`Participant ${i + 2}`}
                      value={p}
                      onChange={(e) => updateParticipant(i, e.target.value)}
                      className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 transition-all placeholder:text-zinc-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeParticipant(i)}
                      className="px-4 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Add Participant Button */}
                {participants.length < MAX_EXTRA && (
                  <button
                    type="button"
                    onClick={addParticipantSlot}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    + Add another person
                  </button>
                )}

                {participants.length >= MAX_EXTRA && (
                  <p className="text-xs text-zinc-500">
                    Maximum 3 additional participants reached
                  </p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-zinc-100 p-6 flex gap-3">
              <button
                onClick={() => {
                  setOpen(false)
                  setGroupName('')
                  setParticipants([''])
                  setError('')
                }}
                className="flex-1 py-3.5 text-zinc-700 font-medium hover:bg-zinc-100 rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                disabled={loading || !groupName.trim()}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-2xl transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Group...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}