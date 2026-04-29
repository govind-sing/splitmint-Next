'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signupAction(prevState: { error: string }, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('name') as string

  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

  if (authError) {
    return { error: authError.message }
  }

  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: authData.user.id, email, full_name: fullName }])

    if (profileError) {
      return { error: profileError.message }
    }
  }

  redirect('/login')
}
