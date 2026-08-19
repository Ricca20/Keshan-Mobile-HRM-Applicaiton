import { auth } from '@/lib/auth'
import {
  Users,
  Clock,
  TreePalm,
  AlertTriangle,
  DollarSign,
  UserX,
} from 'lucide-react'

export default async function AdminDashboard() {
  const session = await auth()

  const statCards = [
    {
      title: 'Total Employees',
      value: '—',
      subtitle: 'Active staff members',
      icon: Users,
      color: 'from-indigo-600 to-violet-600',
      shadow: 'shadow-indigo-500/20',
    },
    {
      title: 'Clocked In Today',
      value: '—',
      subtitle: 'Currently at work',
      icon: Clock,
      color: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-500/20',
    },
    {
      title: 'Pending Leave',
      value: '—',
      subtitle: 'Awaiting approval',
      icon: TreePalm,
      color: 'from-amber-600 to-orange-600',
      shadow: 'shadow-amber-500/20',
    },
    {
      title: 'Flagged Entries',
      value: '—',
      subtitle: 'This week',
      icon: AlertTriangle,
      color: 'from-red-600 to-rose-600',
      shadow: 'shadow-red-500/20',
    },
    {
      title: 'Monthly Payroll',
      value: '—',
      subtitle: 'Estimated total',
      icon: DollarSign,
      color: 'from-blue-600 to-cyan-600',
      shadow: 'shadow-blue-500/20',
    },
    {
      title: 'Absent Today',
      value: '—',
      subtitle: 'Scheduled but not in',
      icon: UserX,
      color: 'from-slate-600 to-slate-500',
      shadow: 'shadow-slate-500/20',
    },
  ]

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Welcome back, {session?.user?.name ?? 'Admin'} 👋
        </h1>
        <p className="text-slate-400 mt-1">
          Here&apos;s what&apos;s happening across your shops today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="group relative bg-slate-900/80 border border-slate-800/50 rounded-2xl p-5 transition-all duration-300 hover:border-slate-700/80 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-400">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-500">{card.subtitle}</p>
                </div>
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} shadow-lg ${card.shadow} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Recent Attendance
          </h3>
          <div className="flex items-center justify-center h-48 border border-dashed border-slate-700/50 rounded-xl">
            <p className="text-sm text-slate-500">
              Live attendance feed — coming in Phase 2
            </p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Pending Actions
          </h3>
          <div className="flex items-center justify-center h-48 border border-dashed border-slate-700/50 rounded-xl">
            <p className="text-sm text-slate-500">
              Leave requests & flagged entries — coming in Phase 3
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
