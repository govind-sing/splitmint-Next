import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GroupDetails from '@/components/GroupDetails'

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (groupError || !group) redirect('/dashboard')

  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('group_id', id)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('group_id', id)
    .order('created_at', { ascending: false })

  return (
    <GroupDetails
      group={group}
      participants={participants ?? []}
      initialExpenses={expenses ?? []}
      groupId={id}
    />
  )
}