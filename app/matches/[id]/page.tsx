import { Suspense } from 'react'
import MatchContent from './MatchContent'

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 p-8 text-center text-2xl text-blue-900">Загрузка...</div>}>
      <MatchContent />
    </Suspense>
  )
}