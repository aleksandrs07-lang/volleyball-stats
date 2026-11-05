'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Rotation from './Rotation'

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
  timestamp: string
  is_undone: boolean
  point_awarded_to: string | null
}

type Match = {
  id: string
  opponent: string
  match_date: string
  score_team_a: number
  score_team_b: number
  current_set: number
  sets_scores: any[]
  serving_team: string
  team_id: string
  rotation_team_a: string[]
  winner: string | null
  match_status: string
}

const roleNames: Record<string, string> = {
  setter: 'Связующий',
  outside: 'Доигровщик',
  opposite: 'Диагональный',
  middle: 'Центральный блокирующий',
  libero: 'Либеро',
}

const actionNames: Record<string, string> = {
  receive: 'Приём',
  defense: 'Защита',
  attack: 'Атака',
  block: 'Блок',
  serve: 'Подача',
}

const allowedActions: Record<string, string[]> = {
  setter: ['receive', 'defense', 'attack', 'block', 'serve'],
  outside: ['receive', 'defense', 'attack', 'block', 'serve'],
  opposite: ['receive', 'defense', 'attack', 'block', 'serve'],
  middle: ['receive', 'defense', 'attack', 'block', 'serve'],
  libero: ['receive', 'defense'],
}

function getResultSymbol(result: string) {
  if (result === 'perfect') return '✓'
  if (result === 'good') return '○'
  if (result === 'error') return '✗'
  if (result === 'ace') return '★'
  if (result === 'kill') return '+'
  if (result === 'blocked') return '○'
  return result || '—'
}

function isActionAllowed(playerRole: string, action: string): boolean {
  const allowed = allowedActions[playerRole] || []
  return allowed.includes(action)
}

export default function MatchContent() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [teamName, setTeamName] = useState('')

  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [selectedResult, setSelectedResult] = useState<string>('')

  const [rotationTeamA, setRotationTeamA] = useState<string[]>([])

  const currentPlayer = players.find(p => p.id === selectedPlayer) || null
  const isFinished = match?.match_status === 'finished'

  useEffect(() => {
    loadMatch()
  }, [matchId])

  useEffect(() => {
    if (match) {
      loadPlayers()
      loadEvents()
      if (match.rotation_team_a && Array.isArray(match.rotation_team_a)) {
        setRotationTeamA(match.rotation_team_a)
      }
    }
  }, [match])

  useEffect(() => {
    if (currentPlayer && selectedAction && !isActionAllowed(currentPlayer.role, selectedAction)) {
      setSelectedAction('')
    }
  }, [selectedPlayer])

  async function loadMatch() {
    const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single()
    if (error) {
      console.error('Ошибка загрузки матча:', error)
      return
    }
    if (data) {
      setMatch(data)
      const { data: teamData } = await supabase.from('teams').select('name').eq('id', data.team_id).single()
      if (teamData) setTeamName(teamData.name)
    }
  }

  async function loadPlayers() {
    if (!match) return
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', match.team_id)
      .order('number', { ascending: true })
    if (data) setPlayers(data)
  }

  async function loadEvents() {
    const { data } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_undone', false)
      .order('timestamp', { ascending: false })
    if (data) setEvents(data)
  }

  function canAddPoint(team: 'A' | 'B'): boolean {
    if (!match) return false
    const scoreA = match.score_team_a
    const scoreB = match.score_team_b
    const difference = Math.abs(scoreA - scoreB)
    if (scoreA >= 25 && scoreA > scoreB && difference >= 2) return false
    if (scoreB >= 25 && scoreB > scoreA && difference >= 2) return false
    return true
  }

  function canSubtractPoint(team: 'A' | 'B'): boolean {
    if (!match) return false
    const currentScore = team === 'A' ? match.score_team_a : match.score_team_b
    return currentScore > 0
  }

  async function addPoint(team: 'A' | 'B') {
    if (isFinished) {
      alert('Матч завершён! Нельзя добавлять очки.')
      return
    }
    if (!canAddPoint(team)) {
      alert('Сет завершён! Нельзя добавлять очки.')
      return
    }
    if (!match) return
    const newScoreA = team === 'A' ? match.score_team_a + 1 : match.score_team_a
    const newScoreB = team === 'B' ? match.score_team_b + 1 : match.score_team_b
    const { error } = await supabase
      .from('matches')
      .update({ score_team_a: newScoreA, score_team_b: newScoreB })
      .eq('id', matchId)
    if (error) {
      console.error('Ошибка обновления счёта:', error)
      return
    }
    loadMatch()
  }

  async function subtractPoint(team: 'A' | 'B') {
    if (isFinished) {
      alert('Матч завершён! Нельзя изменять счёт.')
      return
    }
    if (!canSubtractPoint(team)) {
      alert('Счёт не может быть меньше 0!')
      return
    }
    if (!match) return
    const newScoreA = team === 'A' ? match.score_team_a - 1 : match.score_team_a
    const newScoreB = team === 'B' ? match.score_team_b - 1 : match.score_team_b
    const { error } = await supabase
      .from('matches')
      .update({ score_team_a: newScoreA, score_team_b: newScoreB })
      .eq('id', matchId)
    if (error) {
      console.error('Ошибка обновления счёта:', error)
      return
    }
    loadMatch()
  }

  async function addEvent() {
    if (isFinished) {
      alert('Матч завершён! Нельзя добавлять события.')
      return
    }
    if (!selectedPlayer || !selectedAction || !selectedResult) {
      alert('Выбери игрока, действие и результат')
      return
    }
    const player = players.find(p => p.id === selectedPlayer)
    if (!player) return
    if (!isActionAllowed(player.role, selectedAction)) {
      alert(`${roleNames[player.role]} ${player.name} не может выполнять действие "${actionNames[selectedAction]}"!`)
      return
    }
    let pointAwardedTo: string | null = null
    if (selectedAction === 'serve' && selectedResult === 'perfect') {
      pointAwardedTo = 'A'
    } else if (selectedResult === 'error') {
      pointAwardedTo = 'B'
    } else if (selectedAction === 'attack' && selectedResult === 'perfect') {
      pointAwardedTo = 'A'
    } else if (selectedAction === 'block' && selectedResult === 'perfect') {
      pointAwardedTo = 'A'
    }
    const { error } = await supabase.from('match_events').insert({
      match_id: matchId,
      player_id: selectedPlayer,
      player_name: player.name,
      player_number: player.number,
      set_number: match?.current_set || 1,
      action_type: selectedAction,
      result: selectedResult,
      point_awarded_to: pointAwardedTo,
    })
    if (error) {
      console.error('Ошибка добавления события:', error)
      alert('Ошибка: ' + error.message)
      return
    }
    if (pointAwardedTo) {
      await addPoint(pointAwardedTo as 'A' | 'B')
    }
    setSelectedPlayer('')
    setSelectedAction('')
    setSelectedResult('')
    loadEvents()
  }

  async function undoLastEvent() {
    if (events.length === 0) return
    const lastEvent = events[0]
    const { error } = await supabase
      .from('match_events')
      .update({ is_undone: true })
      .eq('id', lastEvent.id)
    if (error) {
      console.error('Ошибка отмены:', error)
      return
    }
    loadEvents()
  }

  async function nextSet() {
    if(isFinished) {
      alert('Матч уже завершён!')
      return
    }
    if (!match) return
    const newSet = match.current_set + 1
    const newSetsScores = [...(match.sets_scores || []), {
      set: match.current_set,
      team_a: match.score_team_a,
      team_b: match.score_team_b
    }]

    // Считаем выигранные сеты
    let teamAWins = 0
    let teamBWins = 0
    newSetsScores.forEach((s: any) => {
      if (s.team_a > s.team_b) teamAWins++
      if (s.team_b > s.team_a) teamBWins++
    })

    // Проверяем победителя (3 выигранных сета)
    let winner: string | null = null
    let matchStatus = 'in_progress'

    if (teamAWins >= 3) {
      winner = 'A'
      matchStatus = 'finished'
    } else if (teamBWins >= 3) {
      winner = 'B'
      matchStatus = 'finished'
    }

    const { error } = await supabase
      .from('matches')
      .update({
        current_set: newSet,
        score_team_a: 0,
        score_team_b: 0,
        sets_scores: newSetsScores,
        winner: winner,
        match_status: matchStatus
      })
      .eq('id', matchId)

    if (error) {
      console.error('Ошибка перехода к следующему сету:', error)
      return
    }

    if (winner) {
      const winnerName = winner === 'A' ? teamName : match.opponent
      setTimeout(() => {
        alert(`🏆 Матч завершён!\nПобедитель: ${winnerName}\nСчёт по сетам: ${teamAWins}:${teamBWins}`)
      }, 300)
    }

    loadMatch()
  }

  async function previousSet() {
    if (isFinished) {
      alert('Матч завершён! Нельзя возвращаться к предыдущему сету.')
      return
    }
    if (!match || match.current_set <= 1) return
    if (!(match.sets_scores && match.sets_scores.length > 0)) return
    const lastSet = match.sets_scores[match.sets_scores.length - 1]
    const newSetsScores = match.sets_scores.slice(0, -1)
    const { error } = await supabase
      .from('matches')
      .update({
        current_set: lastSet.set,
        score_team_a: lastSet.team_a,
        score_team_b: lastSet.team_b,
        sets_scores: newSetsScores,
        winner: null,
        match_status: 'in_progress'
      })
      .eq('id', matchId)
    if (error) {
      console.error('Ошибка возврата к предыдущему сету:', error)
      return
    }
    loadMatch()
  }

  async function updateRotation(newRotation: string[]) {
    const { error } = await supabase
      .from('matches')
      .update({ rotation_team_a: newRotation })
      .eq('id', matchId)
    if (error) {
      console.error('Ошибка обновления ротации:', error)
      return
    }
    setRotationTeamA(newRotation)
    loadMatch()
  }

  if (!match) {
    return <div className="min-h-screen bg-blue-50 p-8 text-center text-2xl text-blue-900">Загрузка...</div>
  }

  const setsWonA = (match.sets_scores || []).filter((s: any) => s.team_a > s.team_b).length
  const setsWonB = (match.sets_scores || []).filter((s: any) => s.team_b > s.team_a).length

  return (
    <div className="min-h-screen bg-blue-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => router.push(`/teams/${match.team_id}`)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm sm:text-base"
          >
            ← Назад к команде
          </button>
          <button
            onClick={() => router.push(`/matches/${matchId}/stats`)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm sm:text-base"
          >
            📊 Статистика
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-900">
          {teamName} vs {match.opponent}
        </h1>

        {/* Уведомление о победителе */}
        {isFinished && match.winner && (
          <div className="mb-4 p-4 bg-yellow-100 border-4 border-yellow-500 rounded-lg text-center shadow-lg">
            <div className="text-3xl font-bold text-yellow-800">🏆 Победитель: {match.winner === 'A' ? teamName : match.opponent}!
            </div>
            <div className="text-lg text-yellow-700 mt-2 font-semibold">
              Итоговый счёт по сетам: {setsWonA} : {setsWonB}
            </div>
            <div className="text-sm text-yellow-600 mt-1">
              Матч завершён
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <div className="text-center flex-1">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{teamName}</div>
              <div className="text-4xl sm:text-6xl font-bold text-blue-600">{match.score_team_a}</div>
              <div className="text-sm text-blue-700 font-semibold mt-1">Сеты: {setsWonA}</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-base sm:text-lg text-gray-600">Сет {match.current_set}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-2">
                {(match.sets_scores || []).map((s: any, i: number) => (
                  <span key={i} className="mr-2">Сет {s.set}: {s.team_a}-{s.team_b}</span>
                ))}
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{match.opponent}</div>
              <div className="text-4xl sm:text-6xl font-bold text-red-600">{match.score_team_b}</div>
              <div className="text-sm text-red-700 font-semibold mt-1">Сеты: {setsWonB}</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4">
            <button
              onClick={previousSet}
              disabled={match.current_set <= 1 || !(match.sets_scores && match.sets_scores.length > 0) || isFinished}
              className="px-4 py-3 sm:px-6 sm:py-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold text-sm sm:text-lg disabled:bg-gray-400"
            >
              ← Пред. сет
            </button>
            <button
              onClick={() => subtractPoint('A')}
              disabled={!canSubtractPoint('A') || isFinished}
              className="px-4 py-3 sm:px-6 sm:py-4 bg-blue-800 text-white rounded-lg hover:bg-blue-900 font-semibold text-sm sm:text-lg disabled:bg-gray-400"
            >
              -1
            </button>
            <button
              onClick={() => addPoint('A')}
              disabled={!canAddPoint('A') || isFinished}
              className="px-4 py-3 sm:px-6 sm:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-lg disabled:bg-gray-400"
            >
              +1
            </button>
            <button
              onClick={() => addPoint('B')}
              disabled={!canAddPoint('B') || isFinished}
              className="px-4 py-3 sm:px-6 sm:py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm sm:text-lg disabled:bg-gray-400"
            >
              +1
            </button>
            <button
              onClick={() => subtractPoint('B')}
              disabled={!canSubtractPoint('B') || isFinished}
              className="px-4 py-3 sm:px-6 sm:py-4 bg-red-800 text-white rounded-lg hover:bg-red-900 font-semibold text-sm sm:text-lg disabled:bg-gray-400"
            >
              -1
            </button>
            <button
              onClick={nextSet}
              disabled={isFinished}
              className="px-4 py-3 sm:px-6 sm:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm sm:text-lg disabled:bg-gray-400"
            >
              След. сет →
            </button>
          </div>
        </div>

        <Rotation
          players={players}
          rotation={rotationTeamA}
          teamName={teamName}onUpdate={updateRotation}
        />

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-blue-200">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-blue-800">Добавить событие</h2>

          {isFinished && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg text-center text-red-800 font-semibold">
              ⛔ Матч завершён. Добавление событий заблокировано.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-2">Игрок</label>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                disabled={isFinished}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 text-base sm:text-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-200"
              >
                <option value="">Выбери игрока</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    #{player.number} {player.name} ({roleNames[player.role]})
                  </option>
                ))}
              </select>

              {currentPlayer && (
                <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm text-gray-700">
                    Выбран: <strong>#{currentPlayer.number} {currentPlayer.name}</strong> —
                    <span className="ml-1 px-2 py-1 bg-blue-600 text-white rounded text-xs">
                      {roleNames[currentPlayer.role]}
                    </span>
                    {currentPlayer.role === 'libero' && (
                      <span className="ml-2 text-xs text-orange-600">
                        ⚠️ Либеро не может атаковать, блокировать и подавать
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-2">Действие</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(actionNames).map(([key, name]) => {
                  const allowed = currentPlayer ? isActionAllowed(currentPlayer.role, key) : true
                  const isSelected = selectedAction === key
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (isFinished) return
                        if (!allowed) {
                          alert(`${roleNames[currentPlayer?.role || '']} не может выполнять "${name}"!`)
                          return
                        }
                        setSelectedAction(key)
                      }}
                      disabled={!allowed || isFinished}
                      className={`py-4 rounded-lg font-semibold text-base sm:text-lg transition-all ${
                        !allowed
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      }`}
                    >
                      {name}
                      {!allowed && <span className="block text-xs mt-1">🚫</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-base sm:text-lg font-semibold text-gray-700 mb-2">Результат</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => !isFinished && setSelectedResult('perfect')}
                  disabled={isFinished}
                  className={`py-5 rounded-lg font-semibold text-3xl sm:text-4xl ${
                    selectedResult === 'perfect' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                >
                  ✓
                </button>
                <button
                  onClick={() => !isFinished && setSelectedResult('good')}
                  disabled={isFinished}
                  className={`py-5 rounded-lg font-semibold text-3xl sm:text-4xl ${
                    selectedResult === 'good' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                >
                  ○
                </button>
                <button
                  onClick={() => !isFinished && setSelectedResult('error')}
                  disabled={isFinished}
                  className={`py-5 rounded-lg font-semibold text-3xl sm:text-4xl ${
                    selectedResult === 'error' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                >
                  ✗
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={addEvent}
                disabled={isFinished}
                className="flex-1 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 text-base sm:text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Добавить событие
              </button>
              <button
                onClick={undoLastEvent}
                disabled={isFinished}
                className="px-4 sm:px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold text-sm sm:text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                ↶ Отмена
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-2 border-blue-200">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-blue-800">Последние события</h2>
          <div className="space-y-2">
            {events.slice(0, 20).map((event) => (
              <div key={event.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      #{event.player_number || '?'} {event.player_name || 'Игрок'}
                    </span>
                    <span className="text-gray-600 ml-2 text-sm sm:text-base">
                      {actionNames[event.action_type] || event.action_type}
                    </span>
                    <span className="text-2xl sm:text-3xl ml-3 font-bold text-blue-600">
                      {getResultSymbol(event.result)}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500">
                    Сет {event.set_number} • {new Date(event.timestamp).toLocaleTimeString('ru-RU')}
                  </span>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Пока нет событий. Добавь первое!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}