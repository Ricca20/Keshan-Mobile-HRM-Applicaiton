'use client'

import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Clock,
  Calendar,
  TreePalm,
  Receipt,
  LogOut,
  Fingerprint,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', href: '/employee/dashboard', icon: LayoutDashboard },
  { label: 'Clock', href: '/employee/clock', icon: Clock },
  { label: 'Schedule', href: '/employee/schedule', icon: Calendar },
  { label: 'Leave', href: '/employee/leave', icon: TreePalm },
  { label: 'Pay', href: '/employee/paysheet', icon: Receipt },
]

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top header — mobile-first */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 bg-slate-950/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Fingerprint className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight">
              PhoneShop <span className="text-indigo-400">HRM</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">
            {session?.user?.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">{children}</main>

      {/* Bottom navigation — mobile-first */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50 z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/employee/dashboard' &&
                pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]',
                  isActive
                    ? 'text-indigo-400'
                    : 'text-slate-500 hover:text-slate-300 active:scale-95'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-indigo-600/15 shadow-lg shadow-indigo-500/10'
                      : ''
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
