import { Suspense } from 'react'
import TeamContent from './TeamContent'

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 p-8 text-center text-2xl text-blue-900">Загрузка...</div>}>
      <TeamContent />
    </Suspense>
  )
}