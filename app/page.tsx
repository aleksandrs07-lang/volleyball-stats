'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Team = {
  id: string
  name: string
  season: string
}

export default function Home() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSeason, setNewTeamSeason] = useState('')
  const [showMenu, setShowMenu] = useState<string | null>(null)

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('Ошибка загрузки:', error)
      return
    }
    if (data) setTeams(data)
  }

  async function addTeam() {
    if (!newTeamName) return
    const { error } = await supabase.from('teams').insert({ name: newTeamName, season: newTeamSeason })
    if (error) {
      console.error('Ошибка добавления:', error)
      return
    }
    setNewTeamName('')
    setNewTeamSeason('')
    loadTeams()
  }

  async function deleteTeam(id: string) {
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) {
      console.error('Ошибка удаления:', error)
      return
    }
    loadTeams()
    setShowMenu(null)
  }

  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-blue-900"> Волейбольная статистика</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-200">
          <h2 className="text-2xl font-bold mb-4 text-blue-800">Добавить команду</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Название команды"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 text-lg focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Сезон (например, 2025/2026)"
              value={newTeamSeason}
              onChange={(e) => setNewTeamSeason(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 text-lg focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={addTeam}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 text-lg font-semibold"
            >
              Добавить команду
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{team.name}</h3>
                  <p className="text-gray-700 text-lg">Сезон: {team.season || '—'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => router.push(`/teams/${team.id}`)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Состав
                  </button>
                  <button
                    onClick={() => router.push(`/teams/${team.id}`)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Матчи
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(showMenu === team.id ? null : team.id)}
                      className="px-3 py-2 text-gray-600 hover:text-gray-900 text-xl font-bold"
                    >
                      :
                    </button>
                    {showMenu === team.id && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 rounded-lg"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}