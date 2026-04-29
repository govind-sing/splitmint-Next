'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddExpenseModal from '@/components/AddExpenseModal'
import DeleteGroupButton from '@/components/DeleteGroupButton'
import Link from 'next/link'

type Participant = { id: string; name: string; group_id: string }
type Expense = { id: string; description: string; amount: number; payer_id: string; created_at: string }
type Split = { participant_id: string; name: string; amount: number }
type Settlement = { from: string; to: string; amount: number }

type Props = {
  group: { id: string; name: string }
  participants: Participant[]
  initialExpenses: Expense[]
  groupId: string
}

export default function GroupDetails({ group, participants, initialExpenses, groupId }: Props) {
  const router = useRouter()
  const supabase = createClient()


  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [suggestions, setSuggestions] = useState<Settlement[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null)
  const [activeSplits, setActiveSplits] = useState<Split[]>([])
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState({ show: false, message: '' })

  const formatINR = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0)

  const showToast = (message: string) => {
    setToast({ show: true, message })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  useEffect(() => {
    fetchBalancesAndSuggestions()
  }, [])

  async function fetchBalancesAndSuggestions() {
    const { data: exps } = await supabase
      .from('expenses')
      .select('id, amount, payer_id')
      .eq('group_id', groupId)

    if (!exps || exps.length === 0) return

    const expenseIds = exps.map(e => e.id)
    const { data: splits } = await supabase
      .from('expense_splits')
      .select('participant_id, share_amount')
      .in('expense_id', expenseIds)

    const bal: Record<string, number> = {}
    exps.forEach(exp => {
      bal[exp.payer_id] = (bal[exp.payer_id] || 0) + Number(exp.amount)
    })
    splits?.forEach(s => {
      bal[s.participant_id] = (bal[s.participant_id] || 0) - Number(s.share_amount)
    })

    // Settlement suggestions
    const creditors = Object.entries(bal)
      .filter(([_, amt]) => amt > 0.01)
      .map(([id, amt]) => ({ id, amount: amt }))

    const debtors = Object.entries(bal)
      .filter(([_, amt]) => amt < -0.01)
      .map(([id, amt]) => ({ id, amount: Math.abs(amt) }))

    const suggestionsList: Settlement[] = []
    let c = [...creditors]
    let d = [...debtors]

    while (c.length > 0 && d.length > 0) {
      const creditor = c[0]
      const debtor = d[0]
      const payment = Math.min(creditor.amount, debtor.amount)

      suggestionsList.push({ from: debtor.id, to: creditor.id, amount: payment })

      creditor.amount -= payment
      debtor.amount -= payment

      if (creditor.amount < 0.01) c.shift()
      if (debtor.amount < 0.01) d.shift()
    }

    setBalances(bal)
    setSuggestions(suggestionsList)
  }

  async function toggleExpense(id: string) {
    if (expandedExpenseId === id) {
      setExpandedExpenseId(null)
      return
    }

    setActionLoading(`splits-${id}`)
    const { data } = await supabase
      .from('expense_splits')
      .select('share_amount, participant_id, participants(name)')
      .eq('expense_id', id)

    const formatted = (data ?? []).map((item: any) => ({
      participant_id: item.participant_id,
      name: item.participants?.name ?? 'Member',
      amount: Number(item.share_amount)
    }))

    setActiveSplits(formatted)
    setExpandedExpenseId(id)
    setActionLoading(null)
  }

  async function handleDeleteExpense(expenseId: string) {
    setActionLoading(`delete-${expenseId}`)
    const prev = [...expenses]
    setExpenses(e => e.filter(x => x.id !== expenseId))

    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)

    if (error) {
      showToast('Failed to delete expense')
      setExpenses(prev)
    } else {
      showToast('Expense deleted')
      fetchBalancesAndSuggestions()
    }

    setActionLoading(null)
    setActiveMenuId(null)
  }

  async function handleSettle(s: Settlement) {
    setActionLoading(`settle-${s.from}-${s.to}`)

    const fromP = participants.find(p => p.id === s.from)
    const toP = participants.find(p => p.id === s.to)

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert([{
        group_id: groupId,
        description: `Settlement: ${fromP?.name} → ${toP?.name}`,
        amount: s.amount,
        payer_id: s.from
      }])
      .select()
      .single()

    if (error) {
      showToast('Failed to record settlement')
      setActionLoading(null)
      return
    }

    await supabase.from('expense_splits').insert([{
      expense_id: expense.id,
      participant_id: s.to,
      share_amount: s.amount
    }])

    showToast('Settlement recorded!')
    const { data: newExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    setExpenses(newExpenses ?? [])
    fetchBalancesAndSuggestions()
    setActionLoading(null)
  }

  const filteredExpenses = expenses.filter(e =>
    e.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-zinc-50" onClick={() => { setActiveMenuId(null); setShowGroupMenu(false) }}>

      {/* Toast */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-6 py-3 rounded-2xl text-sm z-50 shadow-xl">
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer">
              ←
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900">{group.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <AddExpenseModal 
              groupId={groupId} 
              participants={participants} 
              onSuccess={() => {
                supabase.from('expenses')
                  .select('*')
                  .eq('group_id', groupId)
                  .order('created_at', { ascending: false })
                  .then(({ data }) => setExpenses(data ?? []))
                fetchBalancesAndSuggestions()
              }} 
            />

            {/* Group Menu */}
            <div className="relative">
              <button 
                onClick={(e) => { 
                  e.stopPropagation()
                  setShowGroupMenu(!showGroupMenu)
                }}
                className="p-3 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                ⋮
              </button>

              {showGroupMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-zinc-100 rounded-2xl shadow-xl py-1 z-50"
                     onClick={(e) => e.stopPropagation()}   // ← Important fix
                >
                  <DeleteGroupButton groupId={groupId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Total Spending */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-zinc-100 flex justify-between items-center">
          <div>
            <p className="uppercase text-xs tracking-widest text-zinc-500 font-medium">Total Spent</p>
            <p className="text-4xl font-bold text-zinc-900 mt-2">
              {formatINR(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}
            </p>
          </div>
          <div className="text-6xl text-emerald-100">₹</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar - Members + Balances */}
          <div className="lg:col-span-5 space-y-6">
            {/* Members */}
            <div className="bg-white rounded-3xl p-7 shadow-sm border border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-500 mb-4">MEMBERS</h3>
              <div className="flex flex-wrap gap-2">
                {participants.map(p => (
                  <span key={p.id} className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-2xl text-sm font-medium">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Balances & Suggested Settlements */}
            <div className="bg-white rounded-3xl p-7 shadow-sm border border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-500 mb-5">BALANCES</h3>
              <div className="space-y-4">
                {participants.map(p => {
                  const bal = balances[p.id] || 0
                  return (
                    <div key={p.id} className="flex justify-between">
                      <span>{p.name}</span>
                      <span className={`font-semibold ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {bal >= 0 ? '+' : ''}{formatINR(bal)}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-zinc-500 mb-4">SUGGESTED SETTLEMENTS</h3>
                {suggestions.length > 0 ? (
                  suggestions.map((s, i) => {
                    const fromName = participants.find(p => p.id === s.from)?.name
                    const toName = participants.find(p => p.id === s.to)?.name
                    return (
                      <div key={i} className="bg-zinc-50 rounded-2xl p-4 mb-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <span>{fromName}</span>
                            <span className="text-emerald-500 mx-2">→</span>
                            <span>{toName}</span>
                          </div>
                          <button
                            onClick={() => handleSettle(s)}
                            disabled={!!actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white px-5 py-2 rounded-2xl text-sm font-medium transition-all cursor-pointer"
                          >
                            Settle
                          </button>
                        </div>
                        <p className="text-emerald-600 font-semibold mt-1">{formatINR(s.amount)}</p>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-emerald-600 text-sm">✅ All settled!</p>
                )}
              </div>
            </div>
          </div>

          {/* Expenses Ledger */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
              <div className="px-7 py-5 border-b flex justify-between items-center">
                <h3 className="font-semibold">Expenses</h3>
                <input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2 text-sm w-60 focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              <div className="divide-y divide-zinc-100">
                {filteredExpenses.length === 0 ? (
                  <div className="py-16 text-center text-zinc-400">No expenses found</div>
                ) : (
                  filteredExpenses.map((exp) => {
                    const isExpanded = expandedExpenseId === exp.id
                    const payer = participants.find(p => p.id === exp.payer_id)

                    return (
                      <div key={exp.id} className={`hover:bg-zinc-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                        <div className="p-6 flex items-center justify-between">
                          <div 
                            className="flex-1 flex items-center gap-4 cursor-pointer"
                            onClick={() => toggleExpense(exp.id)}
                          >
                            <div className="w-10 h-10 bg-zinc-100 rounded-2xl flex items-center justify-center text-xl">
                              ₹
                            </div>
                            <div>
                              <p className="font-medium">{exp.description}</p>
                              <p className="text-xs text-zinc-500">Paid by {payer?.name}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-lg">{formatINR(exp.amount)}</span>

                            {/* Expense Three Dots Menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveMenuId(activeMenuId === exp.id ? null : exp.id)
                                }}
                                className="p-2 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
                              >
                                ⋮
                              </button>

                              {activeMenuId === exp.id && (
                                <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-zinc-100 rounded-2xl shadow-xl py-1 z-50">
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    disabled={actionLoading === `delete-${exp.id}`}
                                    className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  >
                                    {actionLoading === `delete-${exp.id}` ? 'Deleting...' : 'Delete Expense'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 pb-6">
                            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                              <p className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Split Breakdown</p>
                              {activeSplits.length > 0 ? activeSplits.map((s, i) => (
                                <div key={i} className="flex justify-between py-1.5 text-sm">
                                  <span>{s.name}</span>
                                  <span className="font-medium">{formatINR(s.amount)}</span>
                                </div>
                              )) : (
                                <p className="text-zinc-400">No splits found</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}