'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95"
    >
      <span>Logout</span>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-4 h-4" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2.5} 
          d="M17 16l4-4m0 0l-4-4m4 4V7m-4 4V7" 
        />
      </svg>
    </button>
  )
}