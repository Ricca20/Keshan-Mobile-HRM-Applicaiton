import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const verification = await prisma.workVerification.findUnique({
    where: { id },
    include: { user: true }
  })

  if (!verification) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-500 mb-6">This verification link does not exist.</p>
          <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">Go to Dashboard</Link>
        </div>
      </div>
    )
  }

  const now = new Date()
  const isExpired = now > verification.expiresAt

  if (verification.status === 'VERIFIED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Verified</h1>
          <p className="text-slate-500 mb-6">You have already completed this work verification check. Thank you!</p>
          <Link href="/employee/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">Return to Dashboard</Link>
        </div>
      </div>
    )
  }

  if (isExpired || verification.status === 'MISSED' || verification.status === 'PENALIZED') {
    // Make sure it's marked as missed in the DB if we caught it expiring here before the cron did
    if (verification.status === 'PENDING') {
      await prisma.workVerification.update({
        where: { id },
        data: { status: 'MISSED' }
      })
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Verification Missed</h1>
          <p className="text-slate-500 mb-6">You did not click the link within the required 2-minute time window.</p>
          <p className="text-sm text-slate-400 mb-6">This has been recorded and your manager has been notified.</p>
          <Link href="/employee/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">Return to Dashboard</Link>
        </div>
      </div>
    )
  }

  // If we made it here, it's valid and within the time window!
  await prisma.workVerification.update({
    where: { id },
    data: {
      status: 'VERIFIED',
      verifiedAt: new Date()
    }
  })

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-emerald-100 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Work Verified!</h1>
        <p className="text-slate-600 mb-6">Your active work status has been successfully confirmed. You can now close this window and return to work.</p>
        <Link href="/employee/dashboard" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all">Back to Dashboard</Link>
      </div>
    </div>
  )
}
