'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  groupId: string
}

export default function DeleteGroupButton({ groupId }: Props) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')

    const supabase = createClient()

    try {
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)

      if (deleteError) throw deleteError

      // Success
      setShowConfirm(false)
      router.push('/dashboard')
      router.refresh()        // Refresh dashboard to remove the deleted group

    } catch (err: any) {
      console.error('Delete group error:', err)
      setError(err.message || 'Failed to delete group. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Menu Item */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full text-left px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
      >
        🗑 Delete Group
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-4">🗑️</div>
              <h3 className="font-semibold text-xl text-zinc-900 mb-2">
                Delete this group?
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                This action is permanent and cannot be undone.<br />
                All expenses, participants, and splits will also be deleted.
              </p>
            </div>

            {error && (
              <div className="mt-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setError('')
                }}
                disabled={loading}
                className="flex-1 py-3.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-2xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-semibold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}