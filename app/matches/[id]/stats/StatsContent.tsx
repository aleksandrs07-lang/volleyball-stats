'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

type Player = {
  id: string
  name: string
  number: number
  role: string
}

type MatchEvent = {
  id: string
  player_id: string
  player_name: string
  player_number: number
  action_type: string
  result: string
  set_number: number
  is_undone: boolean
}

type Match = {
  id: string
  opponent: string
  match_date: string
  score_team_a: number
  score_team_b: number
  current_set: number
  sets_scores: any[]
  team_id: string
  winner: string | null
  match_status: string
}

const roleNames: Record<string, string> = {
  setter: 'Связ.',
  outside: 'Догр.',
  opposite: 'Диаг.',
  middle: 'Центр.',
  libero: 'Либ.',
}

const actionLabels: Record<string, string> = {
  receive: 'Приём',
  defense: 'Защита',
  attack: 'Атака',
  block: 'Блок',
  serve: 'Подача',
}

type ActionName = 'receive' | 'defense' | 'attack' | 'block' | 'serve'
type ResultName = 'perfect' | 'good' | 'error'

type ActionStats = {
  perfect: number
  good: number
  error: number
}

type PlayerStats = {
  player: Player
  stats: Record<ActionName, ActionStats>
  total: number
}

const ALL_ACTIONS: ActionName[] = ['receive', 'defense', 'attack', 'block', 'serve']
const ALL_RESULTS: ResultName[] = ['perfect', 'good', 'error']

const actionColors: Record<ActionName, { header: string; border: string; text: string }> = {
  receive: { header: 'bg-green-700', border: 'border-green-900', text: 'text-green-100' },
  defense: { header: 'bg-teal-700', border: 'border-teal-900', text: 'text-teal-100' },
  attack: { header: 'bg-red-700', border: 'border-red-900', text: 'text-red-100' },
  block: { header: 'bg-purple-700', border: 'border-purple-900', text: 'text-purple-100' },
  serve: { header: 'bg-orange-700', border: 'border-orange-900', text: 'text-orange-100' },
}

export default function StatsContent() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [teamName, setTeamName] = useState('')
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])

  useEffect(() => {
    loadData()
  }, [matchId])

  async function loadData() {
    const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single()
    if (!matchData) return
    setMatch(matchData)

    const { data: teamData } = await supabase.from('teams').select('name').eq('id', matchData.team_id).single()
    if (teamData) setTeamName(teamData.name)

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', matchData.team_id)
      .order('number', { ascending: true })
    if (playersData) setPlayers(playersData)

    const { data: eventsData } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_undone', false)
      .order('timestamp', { ascending: true })
    if (eventsData) setEvents(eventsData)
  }

  useEffect(() => {
    if (players.length === 0 || events.length === 0) return

    const statsMap: Record<string, PlayerStats> = {}

    players.forEach(player => {
      statsMap[player.id] = {
        player,
        stats: {
          receive: { perfect: 0, good: 0, error: 0 },
          defense: { perfect: 0, good: 0, error: 0 },
          attack: { perfect: 0, good: 0, error: 0 },
          block: { perfect: 0, good: 0, error: 0 },
          serve: { perfect: 0, good: 0, error: 0 },
        },
        total: 0,
      }
    })

    events.forEach(event => {
      if (!statsMap[event.player_id]) return
      const ps = statsMap[event.player_id]
      const action = event.action_type as ActionName
      const result = event.result as ResultName
      
      if (ALL_ACTIONS.includes(action) && ALL_RESULTS.includes(result)) {
        ps.stats[action][result]++
        ps.total++
      }
    })

    const statsArray = Object.values(statsMap).sort((a, b) => a.player.number - b.player.number)
    setPlayerStats(statsArray)
  }, [players, events])

  if (!match) {
    return <div className="min-h-screen bg-gray-100 p-8 text-center text-2xl text-gray-900">Загрузка...</div>
  }

  const teamTotals: Record<ActionName, ActionStats> = {
    receive: { perfect: 0, good: 0, error: 0 },
    defense: { perfect: 0, good: 0, error: 0 },
    attack: { perfect: 0, good: 0, error: 0 },
    block: { perfect: 0, good: 0, error: 0 },
    serve: { perfect: 0, good: 0, error: 0 },
  }
  
  playerStats.forEach(ps => {
    ALL_ACTIONS.forEach(action => {
      ALL_RESULTS.forEach(result => {
        teamTotals[action][result] += ps.stats[action][result]
      })
    })
  })

  const setsWonA = (match.sets_scores || []).filter((s: any) => s.team_a > s.team_b).length
  const setsWonB = (match.sets_scores || []).filter((s: any) => s.team_b > s.team_a).length

  function exportToExcel() {
    if (!match) return

    if (playerStats.length === 0) {
      alert('Нет данных для экспорта!')
      return
    }

    const excelData: any[] = []

    excelData.push(['Статистика матча', `${teamName} vs ${match.opponent}`])
    excelData.push(['Дата', match.match_date || ''])
    
    const setsScoreText = `${setsWonA} : ${setsWonB} (по сетам)`
    excelData.push(['Итоговый счёт', setsScoreText])
    
    if (match.sets_scores && match.sets_scores.length > 0) {
      excelData.push([])
      excelData.push(['Результаты по сетам:'])
      match.sets_scores.forEach((s: any) => {
        const winner = s.team_a > s.team_b ? teamName : match.opponent
        excelData.push([`Сет ${s.set}:`, `${s.team_a} - ${s.team_b}`, `Победитель: ${winner}`])
      })
    }
    
    excelData.push([])

    excelData.push([
      'Игрок', 'Номер', 'Позиция',
      'Приём ✓', 'Приём ○', 'Приём ✗',
      'Защита ✓', 'Защита ○', 'Защита ✗',
      'Атака ✓', 'Атака ○', 'Атака ✗',
      'Блок ✓', 'Блок ○', 'Блок ✗',
      'Подача ✓', 'Подача ○', 'Подача ✗',
      'Всего', 'Эффективность %'
    ])

    playerStats.forEach(ps => {
      const perfect = ALL_ACTIONS.reduce((sum, a) => sum + ps.stats[a].perfect, 0)
      const error = ALL_ACTIONS.reduce((sum, a) => sum + ps.stats[a].error, 0)
      const efficiency = ps.total > 0 ? Math.round(((perfect - error) / ps.total) * 100) : 0

      excelData.push([
        ps.player.name,
        ps.player.number,
        roleNames[ps.player.role],
        ps.stats.receive.perfect, ps.stats.receive.good, ps.stats.receive.error,
        ps.stats.defense.perfect, ps.stats.defense.good, ps.stats.defense.error,
        ps.stats.attack.perfect, ps.stats.attack.good, ps.stats.attack.error,
        ps.stats.block.perfect, ps.stats.block.good, ps.stats.block.error,
        ps.stats.serve.perfect, ps.stats.serve.good, ps.stats.serve.error,
        ps.total,
        efficiency
      ])
    })

    const totalPerfect = ALL_ACTIONS.reduce((sum, a) => sum + teamTotals[a].perfect, 0)
    const totalError = ALL_ACTIONS.reduce((sum, a) => sum + teamTotals[a].error, 0)
    const totalAll = playerStats.reduce((sum, ps) => sum + ps.total, 0)
    const totalEfficiency = totalAll > 0 ? Math.round(((totalPerfect - totalError) / totalAll) * 100) : 0

    excelData.push([
      'ИТОГО', '', '',
      teamTotals.receive.perfect, teamTotals.receive.good, teamTotals.receive.error,
      teamTotals.defense.perfect, teamTotals.defense.good, teamTotals.defense.error,
      teamTotals.attack.perfect, teamTotals.attack.good, teamTotals.attack.error,
      teamTotals.block.perfect, teamTotals.block.good, teamTotals.block.error,
      teamTotals.serve.perfect, teamTotals.serve.good, teamTotals.serve.error,
      totalAll,
      totalEfficiency
    ])

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)

    ws['!cols'] = [
      { wch: 20 }, { wch: 8 }, { wch: 12 },
      { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 12 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Статистика')

    const fileName = `Статистика_${teamName}_vs_${match.opponent}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2 bg-white p-4 rounded-lg shadow">
          <button
            onClick={() => router.push(`/matches/${matchId}`)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm sm:text-base font-semibold"
          >
            ← Назад к матчу
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            📊 Статистика: {teamName} vs {match.opponent}
          </h1>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="text-sm text-gray-700 font-semibold">
              Счёт по сетам: {setsWonA} - {setsWonB}
            </div>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base font-semibold flex items-center gap-2"
            >
              📥 Скачать Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 border-2 border-gray-300 overflow-x-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Статистика игроков</h2>
          
          <table className="w-full text-sm sm:text-base min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left border-2 border-gray-400 sticky left-0 bg-gray-800 z-10 text-white font-bold text-base">
                  Игрок
                </th>
                {ALL_ACTIONS.map(action => (
                  <th
                    key={action}
                    colSpan={3}
                    className={`p-3 text-center border-2 border-white text-white font-bold text-lg ${actionColors[action].header}`}
                  >
                    {actionLabels[action]}
                  </th>
                ))}
                <th className="p-3 text-center border-2 border-gray-400 bg-yellow-500 text-gray-900 font-bold text-base">
                  Всего
                </th>
              </tr>
              <tr className="bg-gray-700">
                <th className="p-2 border-2 border-gray-400 sticky left-0 bg-gray-700 z-10"></th>
                {ALL_ACTIONS.map(action => (
                  <Fragment key={action}>
                    <th className={`p-2 border border-gray-600 text-green-300 font-bold text-xl ${actionColors[action].header}`}>✓</th>
                    <th className={`p-2 border border-gray-600 text-yellow-200 font-bold text-xl ${actionColors[action].header}`}>○</th>
                    <th className={`p-2 border border-gray-600 text-red-300 font-bold text-xl ${actionColors[action].header}`}>✗</th>
                  </Fragment>
                ))}
                <th className="p-2 border-2 border-gray-400 bg-yellow-400"></th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((ps, idx) => (
                <tr key={ps.player.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2 border-2 border-gray-400 sticky left-0 bg-inherit font-bold text-gray-900 whitespace-nowrap z-10">
                    <span className="text-blue-700">#{ps.player.number}</span> {ps.player.name}
                    <span className="block text-xs text-gray-600 font-normal">{roleNames[ps.player.role]}</span>
                  </td>
                  {ALL_ACTIONS.map(action => (
                    <Fragment key={action}>
                      <td className="p-2 border border-gray-300 text-center text-green-700 font-bold text-base bg-white">
                        {ps.stats[action].perfect}
                      </td>
                      <td className="p-2 border border-gray-300 text-center text-yellow-600 font-bold text-base bg-white">
                        {ps.stats[action].good}
                      </td>
                      <td className="p-2 border border-gray-300 text-center text-red-600 font-bold text-base bg-white">
                        {ps.stats[action].error}
                      </td>
                    </Fragment>
                  ))}
                  <td className="p-2 border-2 border-gray-400 text-center font-bold text-base bg-yellow-100 text-gray-900">
                    {ps.total}
                  </td>
                </tr>
              ))}
              
              <tr className="bg-gray-800 font-bold">
                <td className="p-3 border-2 border-gray-400 sticky left-0 bg-gray-800 z-10 text-white text-base">
                  ИТОГО
                </td>
                {ALL_ACTIONS.map(action => (
                  <Fragment key={action}>
                    <td className={`p-2 border border-gray-600 text-center text-green-300 text-base ${actionColors[action].header}`}>
                      {teamTotals[action].perfect}
                    </td>
                    <td className={`p-2 border border-gray-600 text-center text-yellow-200 text-base ${actionColors[action].header}`}>
                      {teamTotals[action].good}
                    </td>
                    <td className={`p-2 border border-gray-600 text-center text-red-300 text-base ${actionColors[action].header}`}>
                      {teamTotals[action].error}
                    </td>
                  </Fragment>
                ))}
                <td className="p-3 border-2 border-gray-400 text-center bg-yellow-500 text-gray-900 text-base">
                  {playerStats.reduce((sum, ps) => sum + ps.total, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playerStats.filter(ps => ps.total > 0).map(ps => {
            const perfect = ALL_ACTIONS.reduce((sum, a) => sum + ps.stats[a].perfect, 0)
            const good = ALL_ACTIONS.reduce((sum, a) => sum + ps.stats[a].good, 0)
            const error = ALL_ACTIONS.reduce((sum, a) => sum + ps.stats[a].error, 0)
            const efficiency = ps.total > 0 ? Math.round(((perfect - error) / ps.total) * 100) : 0
            
            return (
              <div key={ps.player.id} className="bg-white rounded-lg shadow p-4 border-2 border-blue-300">
                <div className="flex justify-between items-start mb-3 border-b-2 border-gray-200 pb-2">
                  <div>
                    <div className="text-lg font-bold text-gray-900">#{ps.player.number} {ps.player.name}</div>
                    <div className="text-sm text-gray-700 font-semibold">{roleNames[ps.player.role]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-700">{ps.total}</div>
                    <div className="text-xs text-gray-600">действий</div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {ALL_ACTIONS.map(action => {
                    const total = ps.stats[action].perfect + ps.stats[action].good + ps.stats[action].error
                    if (total === 0) return null
                    return (
                      <div key={action} className="flex justify-between items-center py-1 border-b border-gray-100">
                        <span className="font-bold text-gray-800">{actionLabels[action]}</span>
                        <div className="flex gap-3 text-sm font-bold">
                          <span className="text-green-700">✓ {ps.stats[action].perfect}</span>
                          <span className="text-yellow-600">○ {ps.stats[action].good}</span>
                          <span className="text-red-600">✗ {ps.stats[action].error}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="mt-3 pt-3 border-t-2 border-gray-300 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Эффективность:</span>
                  <span className={`text-xl font-bold ${efficiency >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {efficiency >= 0 ? '+' : ''}{efficiency}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {playerStats.filter(ps => ps.total > 0).length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-700 border-2 border-blue-300 font-semibold">
            Пока нет событий. Добавь первое на странице матча!
          </div>
        )}
      </div>
    </div>
  )
}