import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import AddGroupModal from '@/components/AddGroupModal'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              S
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
              Splitmint
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-zinc-500">Hello!</p>
                <p className="text-sm font-medium text-zinc-900">
                  {profile?.full_name || 'User'}
                </p>
                
              </div>
              <div className="w-9 h-9 bg-zinc-200 rounded-full flex items-center justify-center text-xl">
                👋
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-bold text-zinc-900 tracking-tight">My Groups</h2>
            <p className="text-zinc-600 mt-2 text-lg">
              Manage your debt settlements and group expenses
            </p>
          </div>

          <AddGroupModal />
        </div>

        {/* Groups Grid */}
        {groups && groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="group bg-white rounded-3xl shadow-sm border border-zinc-100 p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl">
                    👥
                  </div>
                  <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </span>
                </div>

                <h3 className="text-2xl font-semibold text-zinc-900 mb-2 line-clamp-2">
                  {group.name}
                </h3>

                <p className="text-sm text-zinc-500 mb-6">
                  Created {new Date(group.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>

                <div className="pt-6 border-t border-zinc-100 text-xs text-zinc-400 flex items-center gap-2">
                  <span>View details</span>
                  <span className="text-lg leading-none text-zinc-300">→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 py-24 px-10 text-center">
            <div className="mx-auto w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-5xl mb-6">
              🗂️
            </div>
            <h3 className="text-2xl font-semibold text-zinc-900 mb-3">No groups yet</h3>
            <p className="text-zinc-600 max-w-sm mx-auto mb-8">
              Create your first group to start splitting expenses and settling debts with friends or roommates.
            </p>
            <AddGroupModal />
          </div>
        )}
      </div>
    </main>
  )
}