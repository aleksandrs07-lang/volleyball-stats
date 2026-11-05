import { Suspense } from 'react'
import HistoryContent from './HistoryContent'

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 p-8 text-center text-2xl text-blue-900">Загрузка истории...</div>}>
      <HistoryContent />
    </Suspense>
  )
}