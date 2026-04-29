'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Participant = {
  id: string
  name: string
}

type Props = {
  groupId: string
  participants: Participant[]
  onSuccess?: () => void
}

export default function AddExpenseModal({ groupId, participants, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [payerId, setPayerId] = useState(participants[0]?.id ?? '')
  const [splitMode, setSplitMode] = useState<'equal' | 'percentage' | 'custom'>('equal')
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateCustomValue(participantId: string, value: string) {
    setCustomValues(prev => ({ ...prev, [participantId]: value }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const amount = parseFloat(totalAmount)
    if (!description.trim() || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid description and amount.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Insert Expense
    const { data: expense, error: expError } = await supabase
      .from('expenses')
      .insert([{
        group_id: groupId,
        description: description.trim(),
        amount,
        payer_id: payerId
      }])
      .select()
      .single()

    if (expError) {
      setError(expError.message)
      setLoading(false)
      return
    }

    // Build splits
    let splits: { expense_id: string; participant_id: string; share_amount: number }[] = []

    if (splitMode === 'equal') {
      const share = amount / participants.length
      splits = participants.map(p => ({
        expense_id: expense.id,
        participant_id: p.id,
        share_amount: share
      }))
    } else if (splitMode === 'percentage' || splitMode === 'custom') {
      splits = participants.map(p => {
        const value = parseFloat(customValues[p.id] || '0') || 0
        const share = splitMode === 'percentage' 
          ? (value / 100) * amount 
          : value
        return {
          expense_id: expense.id,
          participant_id: p.id,
          share_amount: share
        }
      })
    }

    // Fix rounding difference
    const totalCalc = splits.reduce((sum, s) => sum + s.share_amount, 0)
    const diff = amount - totalCalc
    if (Math.abs(diff) > 0.001 && splits.length > 0) {
      splits[0].share_amount += diff
    }

    // Round to 2 decimals
    splits = splits.map(s => ({
      ...s,
      share_amount: parseFloat(s.share_amount.toFixed(2))
    }))

    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(splits)

    if (splitError) {
      setError(splitError.message)
      setLoading(false)
      return
    }

    // Success
    setOpen(false)
    setDescription('')
    setTotalAmount('')
    setPayerId(participants[0]?.id ?? '')
    setSplitMode('equal')
    setCustomValues({})
    setLoading(false)

    onSuccess?.()
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all text-white font-semibold px-5 py-3 rounded-2xl text-sm cursor-pointer"
      >
        <span>+</span>
        <span>Add Expense</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-8 pt-8 pb-4 border-b border-zinc-100">
              <h2 className="text-2xl font-semibold text-zinc-900">Add New Expense</h2>
              <p className="text-zinc-600 text-sm mt-1">Record a shared expense in this group</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
                  {error}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dinner at Mainland China, Petrol, Groceries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 transition-all placeholder:text-zinc-400"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Total Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 transition-all placeholder:text-zinc-400"
                />
              </div>

              {/* Paid By */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Paid By
                </label>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 transition-all cursor-pointer"
                >
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Mode */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-3">
                  How should it be split?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['equal', 'percentage', 'custom'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSplitMode(mode)}
                      className={`py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer ${
                        splitMode === mode
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {mode === 'equal' ? 'Equal' : mode === 'percentage' ? 'Percentage' : 'Custom'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom / Percentage Fields */}
              {(splitMode === 'percentage' || splitMode === 'custom') && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-zinc-700">
                    {splitMode === 'percentage' ? 'Enter percentage for each member' : 'Enter amount for each member'}
                  </p>
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-4">
                      <span className="text-zinc-700 font-medium w-32 truncate">{p.name}</span>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder={splitMode === 'percentage' ? '0' : '0.00'}
                          value={customValues[p.id] ?? ''}
                          onChange={(e) => updateCustomValue(p.id, e.target.value)}
                          className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                          {splitMode === 'percentage' ? '%' : '₹'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Equal Split Preview */}
              {splitMode === 'equal' && totalAmount && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm">
                  Each member will pay <span className="font-semibold text-emerald-700">
                    ₹{(parseFloat(totalAmount) / participants.length).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-zinc-100 p-6 flex gap-3">
              <button
                onClick={() => {
                  setOpen(false)
                  setDescription('')
                  setTotalAmount('')
                  setCustomValues({})
                  setError('')
                }}
                className="flex-1 py-3.5 text-zinc-700 font-medium hover:bg-zinc-100 rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading || !description.trim() || !totalAmount}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-2xl transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? 'Saving Expense...' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}