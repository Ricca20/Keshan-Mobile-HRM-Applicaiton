import { auth } from '@/lib/auth'
import { Clock, Calendar, TreePalm, Receipt } from 'lucide-react'

export default async function EmployeeDashboard() {
  const session = await auth()

  return (
    <div className="animate-fade-in space-y-6 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-white">
          Hi, {session?.user?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Clock Status Card */}
      <div className="bg-slate-900/80 border border-slate-800/50 rounded-2xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800/80 border-2 border-slate-700/50 mb-4">
          <Clock className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-sm text-slate-400 mb-1">Current Status</p>
        <p className="text-xl font-bold text-slate-300">Not Clocked In</p>
        <p className="text-xs text-slate-500 mt-2">
          Clock in from the Clock tab to start your shift
        </p>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/80 border border-slate-800/50 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600/15 mx-auto mb-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400">This Week</p>
          <p className="text-lg font-bold text-white mt-0.5">— shifts</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/50 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600/15 mx-auto mb-2">
            <TreePalm className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs text-slate-400">Leave Left</p>
          <p className="text-lg font-bold text-white mt-0.5">— days</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/50 rounded-2xl p-4 text-center col-span-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/15 mx-auto mb-2">
            <Receipt className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xs text-slate-400">Latest Paysheet</p>
          <p className="text-lg font-bold text-white mt-0.5">
            No paysheets yet
          </p>
        </div>
      </div>
    </div>
  )
}
