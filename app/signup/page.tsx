'use client'

import { useActionState } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signupAction } from './actions'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(signupAction, { error: '' })

  // Redirect if already logged in
  useEffect(() => {
    async function checkSession() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) router.push('/dashboard')
    }
    checkSession()
  }, [router])

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Minimal Brand */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
              S
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Splitmint
            </h1>
          </div>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-9">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900">Create account</h2>
            <p className="text-zinc-600 mt-1 text-sm">Join Splitmint to manage your expenses</p>
          </div>

          {/* Error Message */}
          {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 transition-all text-white font-semibold py-3.5 rounded-2xl text-base cursor-pointer disabled:cursor-not-allowed"
            >
              {isPending ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-zinc-600 mt-8">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-blue-600 font-medium hover:text-blue-700 hover:underline transition-colors cursor-pointer"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}