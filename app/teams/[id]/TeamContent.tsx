'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

type Player = {
  id: string
  name: string
  number: number
  role: string
}

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

const roleNames: Record<string, string> = {
  setter: 'Связующий',
  outside: 'Доигровщик',
  opposite: 'Диагональный',
  middle: 'Центральный блокирующий',
  libero: 'Либеро',
}

export default function TeamContent() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string

  const [teamName, setTeamName] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])

  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showAddMatch, setShowAddMatch] = useState(false)

  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerNumber, setNewPlayerNumber] = useState('')
  const [newPlayerRole, setNewPlayerRole] = useState('outside')

  const [newMatchOpponent, setNewMatchOpponent] = useState('')
  const [newMatchDate, setNewMatchDate] = useState('')

  useEffect(() => {
    loadTeam()
    loadPlayers()
    loadMatches()
  }, [teamId])

  async function loadTeam() {
    const { data } = await supabase.from('teams').select('name').eq('id', teamId).single()
    if (data) setTeamName(data.name)
  }

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('number', { ascending: true })
    if (data) setPlayers(data)
  }

  async function loadMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('team_id', teamId)
      .order('match_date', { ascending: false })
    if (data) setMatches(data)
  }

  async function addPlayer() {
    if (!newPlayerName || !newPlayerNumber) {
      alert('Заполни имя и номер игрока!')
      return
    }
    const { error } = await supabase.from('players').insert({
      team_id: teamId,
      name: newPlayerName,
      number: parseInt(newPlayerNumber),
      role: newPlayerRole,
    })
    if (error) {
      console.error('Ошибка добавления игрока:', error)
      alert('Ошибка: ' + error.message)
      return
    }
    setNewPlayerName('')
    setNewPlayerNumber('')
    setNewPlayerRole('outside')
    setShowAddPlayer(false)
    loadPlayers()
  }

  async function deletePlayer(playerId: string) {
    if (!confirm('Удалить игрока?')) return
    const { error } = await supabase.from('players').delete().eq('id', playerId)
    if (error) {
      console.error('Ошибка удаления:', error)
      return
    }
    loadPlayers()
  }

  async function addMatch() {
    if (!newMatchOpponent) {
      alert('Укажи соперника!')
      return
    }
    const { error } = await supabase.from('matches').insert({
      team_id: teamId,
      opponent: newMatchOpponent,
      match_date: newMatchDate || new Date().toISOString().split('T')[0],
      score_team_a: 0,
      score_team_b: 0,
      current_set: 1,
      sets_scores: [],
      match_status: 'in_progress',
    })
    if (error) {
      console.error('Ошибка добавления матча:', error)
      alert('Ошибка: ' + error.message)
      return
    }
    setNewMatchOpponent('')
    setNewMatchDate('')
    setShowAddMatch(false)
    loadMatches()
  }

  async function deleteMatch(matchId: string) {
    if (!confirm('Удалить матч и всю его статистику?')) return
    const { error: eventsError } = await supabase
      .from('match_events')
      .delete()
      .eq('match_id', matchId)
    if (eventsError) {
      console.error('Ошибка удаления событий:', eventsError)
    }
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) {
      console.error('Ошибка удаления матча:', error)
      return
    }
    loadMatches()
  }

  if (!teamName) {
    return <div className="min-h-screen bg-blue-50 p-8 text-center text-2xl text-blue-900">Загрузка...</div>
  }

  return (
    <div className="min-h-screen bg-blue-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm sm:text-base"
          >
            ← На главную
          </button>
          <button
            onClick={() => router.push(`/teams/${teamId}/history`)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm sm:text-base font-semibold"
          >
            📈 История матчей
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-900">
          {teamName}
        </h1>

        {/* Состав команды */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-blue-200">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800">Состав команды</h2>
            <button
              onClick={() => setShowAddPlayer(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base font-semibold"
            >
              + Добавить игрока
            </button>
          </div>

          {players.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Пока нет игроков в составе
            </div>
          ) : (
            <div className="space-y-2">
              {players.map(player => (
                <div
                  key={player.id}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {player.number}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-600">{roleNames[player.role]}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => deletePlayer(player.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Матчи */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-2 border-blue-200">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800">Матчи</h2>
            <button
              onClick={() => setShowAddMatch(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base font-semibold"
            >
              + Добавить матч
            </button>
          </div>

          {matches.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Пока нет матчей
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
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {isWin && <span className="text-green-700">✅ Победа</span>}
                            {isLoss && <span className="text-red-700">❌ Поражение</span>}
                            {isDraw && <span className="text-yellow-700">⏳ В процессе</span>}
                          </div>
                          <div className="text-sm text-gray-700 font-semibold">
                            Счёт: {setsWonA} : {setsWonB}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMatch(match.id)
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Модальное окно добавления игрока */}
        {showAddPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4 text-blue-900">Добавить игрока</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Имя</label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 text-base focus:border-blue-500 focus:outline-none"
                    placeholder="Введите имя игрока"
                  />
                </div>
                
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Номер</label>
                  <input
                    type="number"
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 text-base focus:border-blue-500 focus:outline-none"
                    placeholder="Введите номер"
                  />
                </div>
                
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Позиция</label>
                  <select
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 text-base focus:border-blue-500 focus:outline-none"
                  >
                    <option value="setter">Связующий</option>
                    <option value="outside">Доигровщик</option>
                    <option value="opposite">Диагональный</option>
                    <option value="middle">Центральный блокирующий</option>
                    <option value="libero">Либеро</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddPlayer(false)}
                  className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={addPlayer}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно добавления матча */}
        {showAddMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4 text-blue-900">Добавить матч</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Соперник</label>
                  <input
                    type="text"
                    value={newMatchOpponent}
                    onChange={(e) => setNewMatchOpponent(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 text-base focus:border-blue-500 focus:outline-none"
                    placeholder="Введите название соперника"
                  />
                </div>
                
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Дата</label>
                  <input
                    type="date"
                    value={newMatchDate}
                    onChange={(e) => setNewMatchDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 text-base focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddMatch(false)}
                  className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={addMatch}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}