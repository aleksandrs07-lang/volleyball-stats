'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

type Match = {
  id: string
  opponent: string
  match_date: string
  score_team_a: number
  score_team_b: number
  current_set: number
  sets_scores: any[]
  winner: string | null
  match_status: string
  team_id: string
}

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
  match_id: string
}

type PlayerSeasonStats = {
  player: Player
  total: number
  perfect: number
  good: number
  error: number
  efficiency: number
  matches: number
}

const roleNames: Record<string, string> = {
  setter: 'Связ.',
  outside: 'Догр.',
  opposite: 'Диаг.',
  middle: 'Центр.',
  libero: 'Либ.',
}

export default function HistoryContent() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string

  const [teamName, setTeamName] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [seasonStats, setSeasonStats] = useState<PlayerSeasonStats[]>([])

  useEffect(() => {
    loadData()
  }, [teamId])

  async function loadData() {
    // Загружаем название команды
    const { data: teamData } = await supabase.from('teams').select('name').eq('id', teamId).single()
    if (teamData) setTeamName(teamData.name)

    // Загружаем все матчи команды
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('team_id', teamId)
      .order('match_date', { ascending: false })
    if (matchesData) setMatches(matchesData)

    // Загружаем игроков команды
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('number', { ascending: true })
    if (playersData) setPlayers(playersData)

    // Загружаем все события по всем матчам команды
    if (matchesData && matchesData.length > 0) {
      const matchIds = matchesData.map(m => m.id)
      const { data: eventsData } = await supabase
        .from('match_events')
        .select('*')
        .in('match_id', matchIds)
        .eq('is_undone', false)
      if (eventsData) setEvents(eventsData)
    }
  }

  // Считаем статистику за сезон
  useEffect(() => {
    if (players.length === 0 || events.length === 0) return

    const statsMap: Record<string, PlayerSeasonStats> = {}

    players.forEach(player => {
      statsMap[player.id] = {
        player,
        total: 0,
        perfect: 0,
        good: 0,
        error: 0,
        efficiency: 0,
        matches: 0,
      }
    })

    // Считаем в каких матчах играл каждый игрок
    const playerMatches = new Map<string, Set<string>>()

    events.forEach(event => {
      if (!statsMap[event.player_id]) return
      const ps = statsMap[event.player_id]
      
      ps.total++
      if (event.result === 'perfect') ps.perfect++
      else if (event.result === 'good') ps.good++
      else if (event.result === 'error') ps.error++

      // Считаем уникальные матчи
      if (!playerMatches.has(event.player_id)) {
        playerMatches.set(event.player_id, new Set())
      }
      playerMatches.get(event.player_id)!.add(event.match_id)
    })

    // Считаем эффективность и количество матчей
    Object.values(statsMap).forEach(ps => {
      ps.efficiency = ps.total > 0 ? Math.round(((ps.perfect - ps.error) / ps.total) * 100) : 0
      ps.matches = playerMatches.get(ps.player.id)?.size || 0
    })

    // Сортируем по эффективности (от лучшей к худшей)
    const statsArray = Object.values(statsMap)
      .filter(ps => ps.total > 0)
      .sort((a, b) => b.efficiency - a.efficiency)
    
    setSeasonStats(statsArray)
  }, [players, events])

  // Статистика по матчам
  const totalMatches = matches.length
  const wins = matches.filter(m => m.winner === 'A').length
  const losses = matches.filter(m => m.winner === 'B').length
  const inProgress = matches.filter(m => m.match_status !== 'finished').length

  if (!teamName) {
    return <div className="min-h-screen bg-blue-50 p-8 text-center text-2xl text-blue-900">Загрузка...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Шапка */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2 bg-white p-4 rounded-lg shadow">
          <button
            onClick={() => router.push(`/teams/${teamId}`)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm sm:text-base font-semibold"
          >
            ← Назад к команде
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            📈 История матчей: {teamName}
          </h1>
          <div className="text-sm text-gray-700 font-semibold">
            Всего матчей: {totalMatches}
          </div>
        </div>

        {/* Общая статистика сезона */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-2 border-blue-300 text-center">
            <div className="text-3xl font-bold text-blue-700">{totalMatches}</div>
            <div className="text-sm text-gray-600 font-semibold">Всего матчей</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-2 border-green-300 text-center">
            <div className="text-3xl font-bold text-green-700">{wins}</div>
            <div className="text-sm text-gray-600 font-semibold">Побед</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-2 border-red-300 text-center">
            <div className="text-3xl font-bold text-red-700">{losses}</div>
            <div className="text-sm text-gray-600 font-semibold">Поражений</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-2 border-yellow-300 text-center">
            <div className="text-3xl font-bold text-yellow-700">
              {totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600 font-semibold">Процент побед</div>
          </div>
        </div>

        {/* Список матчей */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 border-2 border-gray-300">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">📅 Все матчи</h2>
          
          {matches.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Пока нет сыгранных матчей
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(match => {
                const isWin = match.winner === 'A'
                const isLoss = match.winner === 'B'
                const isDraw = match.match_status !== 'finished'
                const setsWonA = (match.sets_scores || []).filter((s: any) => s.team_a > s.team_b).length
                const setsWonB = (match.sets_scores || []).filter((s: any) => s.team_b > s.team_a).length

                return (
                  <div
                    key={match.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${
                      isWin ? 'bg-green-50 border-green-400' :
                      isLoss ? 'bg-red-50 border-red-400' :
                      'bg-yellow-50 border-yellow-400'
                    }`}
                    onClick={() => router.push(`/matches/${match.id}`)}
                  >
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900">
                          {teamName} vs {match.opponent}
                        </div>
                        <div className="text-sm text-gray-600">
                          {match.match_date ? new Date(match.match_date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {isWin && <span className="text-green-700">✅ Победа</span>}
                          {isLoss && <span className="text-red-700">❌ Поражение</span>}
                          {isDraw && <span className="text-yellow-700">⏳ В процессе</span>}
                        </div>
                        <div className="text-sm text-gray-700 font-semibold">
                          Счёт: {setsWonA} : {setsWonB}
                        </div>
                      </div>
                    </div>
                    
                    {/* Детализация по сетам */}
                    {match.sets_scores && match.sets_scores.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-2 text-xs">
                        {match.sets_scores.map((s: any, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-white rounded border border-gray-300">
                            Сет {s.set}: <strong>{s.team_a}-{s.team_b}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Лучшие игроки сезона */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 border-2 border-gray-300">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">🏆 Лучшие игроки сезона</h2>
          
          {seasonStats.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Пока нет статистики
            </div>
          ) : (
            <div className="space-y-3">
              {seasonStats.slice(0, 10).map((ps, idx) => (
                <div
                  key={ps.player.id}
                  className={`p-4 rounded-lg border-2 flex justify-between items-center flex-wrap gap-2 ${
                    idx === 0 ? 'bg-yellow-50 border-yellow-400' :
                    idx === 1 ? 'bg-gray-50 border-gray-400' :
                    idx === 2 ? 'bg-orange-50 border-orange-400' :
                    'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                      idx === 1 ? 'bg-gray-400 text-white' :
                      idx === 2 ? 'bg-orange-400 text-white' :
                      'bg-blue-200 text-blue-900'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        #{ps.player.number} {ps.player.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {roleNames[ps.player.role]} • {ps.matches} матчей
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-700">
                      {ps.efficiency >= 0 ? '+' : ''}{ps.efficiency}%
                    </div>
                    <div className="text-xs text-gray-600">
                      {ps.total} действий (✓{ps.perfect} ○{ps.good} ✗{ps.error})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Полная таблица по игрокам за сезон */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-2 border-gray-300 overflow-x-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">📊 Статистика игроков за сезон</h2>
          
          {seasonStats.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Пока нет статистики
            </div>
          ) : (
            <table className="w-full text-sm sm:text-base min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-blue-700">
                  <th className="p-3 text-left border-2 border-white text-white font-bold">#</th>
                  <th className="p-3 text-left border-2 border-white text-white font-bold">Игрок</th>
                  <th className="p-3 text-center border-2 border-white text-white font-bold">Позиция</th>
                  <th className="p-3 text-center border-2 border-white text-white font-bold">Матчей</th>
                  <th className="p-3 text-center border-2 border-white text-white font-bold">Действий</th>
                  <th className="p-3 text-center border-2 border-white text-white font-bold">✓</th>
                  <th className="p-3 text-center border-2 border-white text-white font-bold">○</th>
                  <th className="p-3 text-center border-2 border-white text-white font-bold">✗</th>
                  <th className="p-3 text-center border-2 border-white text-white font-bold bg-yellow-500 text-gray-900">Эфф. %</th>
                </tr>
              </thead>
              <tbody>
                {seasonStats.map((ps, idx) => (
                  <tr key={ps.player.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2 border border-gray-300 font-bold text-blue-700">#{ps.player.number}</td>
                    <td className="p-2 border border-gray-300 font-bold text-gray-900">{ps.player.name}</td>
                    <td className="p-2 border border-gray-300 text-center text-gray-700">{roleNames[ps.player.role]}</td>
                    <td className="p-2 border border-gray-300 text-center font-semibold">{ps.matches}</td>
                    <td className="p-2 border border-gray-300 text-center font-semibold">{ps.total}</td>
                    <td className="p-2 border border-gray-300 text-center text-green-700 font-bold">{ps.perfect}</td>
                    <td className="p-2 border border-gray-300 text-center text-yellow-600 font-bold">{ps.good}</td>
                    <td className="p-2 border border-gray-300 text-center text-red-600 font-bold">{ps.error}</td>
                    <td className={`p-2 border border-gray-300 text-center font-bold ${
                      ps.efficiency >= 50 ? 'bg-green-100 text-green-700' :
                      ps.efficiency >= 0 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {ps.efficiency >= 0 ? '+' : ''}{ps.efficiency}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}