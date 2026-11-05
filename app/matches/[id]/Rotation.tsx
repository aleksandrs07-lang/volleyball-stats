'use client'

import { useState } from 'react'

type Player = {
  id: string
  name: string
  number: number
  role: string
}

type RotationProps = {
  players: Player[]
  rotation: string[]
  teamName: string
  onUpdate: (rotation: string[]) => void
}

const positionNames: Record<number, string> = {
  1: 'Зона 1 (Подача)',
  2: 'Зона 2',
  3: 'Зона 3',
  4: 'Зона 4',
  5: 'Зона 5',
  6: 'Зона 6',
}

const roleNames: Record<string, string> = {
  setter: 'Связ.',
  outside: 'Догр.',
  opposite: 'Диаг.',
  middle: 'Центр.',
  libero: 'Либ.',
}

export default function Rotation({ players, rotation, teamName, onUpdate }: RotationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [selectedRotation, setSelectedRotation] = useState<string[]>([])

  const getPlayerAtPosition = (pos: number) => {
    const playerId = rotation[pos - 1]
    return players.find(p => p.id === playerId)
  }

  const rotatePlayers = () => {
    if (rotation.length !== 6) {
      alert('Сначала настрой ротацию (6 игроков)!')
      return
    }

    const newRotation = [...rotation]
    
    const liberoIndex = newRotation.findIndex(playerId => {
      const player = players.find(p => p.id === playerId)
      return player?.role === 'libero'
    })
    
    const middleIndex = newRotation.findIndex(playerId => {
      const player = players.find(p => p.id === playerId)
      return player?.role === 'middle'
    })

    // Поворот ПРОТИВ часовой стрелки: 1→2→3→4→5→6→1
    const temp = newRotation[0]
    newRotation[0] = newRotation[1]
    newRotation[1] = newRotation[2]
    newRotation[2] = newRotation[3]
    newRotation[3] = newRotation[4]
    newRotation[4] = newRotation[5]
    newRotation[5] = temp

    // Автоматическая замена либеро ↔ ЦБ
    if (liberoIndex !== -1 && middleIndex !== -1) {
      const liberoPosition = newRotation.indexOf(rotation[liberoIndex]) + 1
      if (liberoPosition === 1 || liberoPosition === 5 || liberoPosition === 6) {
        const temp2 = newRotation[liberoIndex]
        newRotation[liberoIndex] = newRotation[middleIndex]
        newRotation[middleIndex] = temp2
      }
    }

    onUpdate(newRotation)
  }

  const openSetup = () => {
    if (rotation.length === 6) {
      setSelectedRotation([...rotation])
    } else {
      setSelectedRotation([])
    }
    setIsSetupOpen(true)
  }

  const addPlayerToRotation = (playerId: string) => {
    if (selectedRotation.length >= 6) {
      alert('Максимум 6 игроков!')
      return
    }
    if (selectedRotation.includes(playerId)) {
      return
    }
    setSelectedRotation([...selectedRotation, playerId])
  }

  const removePlayerFromRotation = (playerId: string) => {
    setSelectedRotation(selectedRotation.filter(id => id !== playerId))
  }

  const movePlayerInRotation = (playerId: string, direction: 'up' | 'down') => {
    const index = selectedRotation.indexOf(playerId)
    if (index === -1) return
    
    const newRotation = [...selectedRotation]
    
    if (direction === 'up' && index > 0) {
      const temp = newRotation[index]
      newRotation[index] = newRotation[index - 1]
      newRotation[index - 1] = temp
    } else if (direction === 'down' && index < 5) {
      const temp = newRotation[index]
      newRotation[index] = newRotation[index + 1]
      newRotation[index + 1] = temp
    }
    
    setSelectedRotation(newRotation)
  }

  const saveRotation = async () => {
    if (selectedRotation.length !== 6) {
      alert('Выбери ровно 6 игроков!')
      return
    }
    onUpdate(selectedRotation)
    setIsSetupOpen(false)
  }

  // Компонент для отображения игрока в зоне
  const renderPlayerInZone = (player: Player | undefined, pos: number) => {
    if (!player) {
      return <div className="text-gray-400 text-sm">—</div>
    }

    const isSetter = player.role === 'setter'
    const isLibero = player.role === 'libero'
    const isPos1 = pos === 1

    let bgColor = 'bg-white'
    let borderColor = 'border-blue-400'
    let textColor = 'text-blue-900'

    if (isSetter) {
      bgColor = 'bg-red-100'
      borderColor = 'border-red-500'
      textColor = 'text-red-900'
    } else if (isLibero) {
      bgColor = 'bg-green-100'
      borderColor = 'border-green-500'
      textColor = 'text-green-900'
    }

    if (isPos1) {
      bgColor = isSetter ? 'bg-red-200' : 'bg-yellow-100'
      borderColor = isSetter ? 'border-red-500' : 'border-yellow-400'
    }

    return (
      <div>
        <div className={`font-bold text-lg ${textColor}`}>
          #{player.number} {player.name}
        </div>
        <div className={`text-xs font-semibold mt-1 ${
          isSetter ? 'text-red-700' : isLibero ? 'text-green-700' : 'text-gray-600'
        }`}>
          {roleNames[player.role] || player.role}
        </div>
        {isPos1 && (
          <div className="text-xs text-yellow-600 mt-1">🏐 Подаёт</div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 border-2 border-blue-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-blue-900">
          🔄 Ротация: {teamName}
        </h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
        >
          {isOpen ? 'Скрыть' : 'Показать схему'}
        </button>
      </div>

      {/* Кнопки */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={rotatePlayers}
          className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-base"
        >
          🔄 Повернуть (против часовой)
        </button>
        <button
          onClick={openSetup}
          className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-base"
        >
          ⚙️ {rotation.length === 6 ? 'Изменить ротацию' : 'Настроить ротацию'}
        </button>
      </div>

      {/* Легенда */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-200 border-2 border-red-500 rounded"></div>
          <span className="text-gray-700 font-semibold">Связующий</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
          <span className="text-gray-700 font-semibold">Либеро</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
          <span className="text-gray-700 font-semibold">Подача</span>
        </div>
      </div>

      {/* Схема площадки */}
      {isOpen && rotation.length === 6 && (
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            {/* Зона 4 */}
            <div className={`p-4 rounded-lg border-2 text-center min-h-[100px] flex flex-col justify-center ${
              getPlayerAtPosition(4)?.role === 'setter' ? 'bg-red-100 border-red-500' :
              getPlayerAtPosition(4)?.role === 'libero' ? 'bg-green-100 border-green-500' :
              'bg-white border-blue-400'
            }`}>
              <div className="text-xs text-gray-600 mb-2 font-semibold">{positionNames[4]}</div>
              {renderPlayerInZone(getPlayerAtPosition(4), 4)}
            </div>

            {/* Зона 3 */}
            <div className={`p-4 rounded-lg border-2 text-center min-h-[100px] flex flex-col justify-center ${
              getPlayerAtPosition(3)?.role === 'setter' ? 'bg-red-100 border-red-500' :
              getPlayerAtPosition(3)?.role === 'libero' ? 'bg-green-100 border-green-500' :
              'bg-white border-blue-400'
            }`}><div className="text-xs text-gray-600 mb-2 font-semibold">{positionNames[3]}</div>
              {renderPlayerInZone(getPlayerAtPosition(3), 3)}
            </div>

            {/* Зона 2 */}
            <div className={`p-4 rounded-lg border-2 text-center min-h-[100px] flex flex-col justify-center ${
              getPlayerAtPosition(2)?.role === 'setter' ? 'bg-red-100 border-red-500' :
              getPlayerAtPosition(2)?.role === 'libero' ? 'bg-green-100 border-green-500' :
              'bg-white border-blue-400'
            }`}>
              <div className="text-xs text-gray-600 mb-2 font-semibold">{positionNames[2]}</div>
              {renderPlayerInZone(getPlayerAtPosition(2), 2)}
            </div>

            {/* Зона 5 */}
            <div className={`p-4 rounded-lg border-2 text-center min-h-[100px] flex flex-col justify-center ${
              getPlayerAtPosition(5)?.role === 'setter' ? 'bg-red-100 border-red-500' :
              getPlayerAtPosition(5)?.role === 'libero' ? 'bg-green-100 border-green-500' :
              'bg-white border-blue-400'
            }`}>
              <div className="text-xs text-gray-600 mb-2 font-semibold">{positionNames[5]}</div>
              {renderPlayerInZone(getPlayerAtPosition(5), 5)}
            </div>

            {/* Зона 6 */}
            <div className={`p-4 rounded-lg border-2 text-center min-h-[100px] flex flex-col justify-center ${
              getPlayerAtPosition(6)?.role === 'setter' ? 'bg-red-100 border-red-500' :
              getPlayerAtPosition(6)?.role === 'libero' ? 'bg-green-100 border-green-500' :
              'bg-white border-blue-400'
            }`}>
              <div className="text-xs text-gray-600 mb-2 font-semibold">{positionNames[6]}</div>
              {renderPlayerInZone(getPlayerAtPosition(6), 6)}
            </div>

            {/* Зона 1 */}
            <div className={`p-4 rounded-lg border-2 text-center min-h-[100px] flex flex-col justify-center ring-4 ${
              getPlayerAtPosition(1)?.role === 'setter' ? 'bg-red-200 border-red-500 ring-red-200' :
              'bg-yellow-100 border-yellow-400 ring-yellow-200'
            }`}>
              <div className="text-xs text-gray-600 mb-2 font-semibold">{positionNames[1]}</div>
              {renderPlayerInZone(getPlayerAtPosition(1), 1)}
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p> Зона 1 (подача) выделена жёлтым</p>
            <p>Ротация идёт против часовой стрелки</p>
          </div>
        </div>
      )}

      {rotation.length !== 6 && (
        <div className="text-center text-gray-500 py-4">
          Ротация не настроена. Нажми "⚙️ Настроить ротацию" выше.
        </div>
      )}

      {/* Модальное окно настройки */}
      {isSetupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">
              Настройка ротации: выбери 6 игроков
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Выбрано: {selectedRotation.length} / 6. Нажми на игрока, чтобы добавить его в следующую зону.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Список игроков */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-gray-900 bg-blue-100 p-2 rounded-lg">Игроки:</h3>
                <div className="space-y-2">
                  {players.map(player => {
                    const isSelected = selectedRotation.includes(player.id)
                    const isSetter = player.role === 'setter'
                    const isLibero = player.role === 'libero'
                    
                    return (
                      <button
                        key={player.id}onClick={() => isSelected ? removePlayerFromRotation(player.id) : addPlayerToRotation(player.id)}
                        className={`w-full px-4 py-3 rounded-lg text-left font-semibold transition-all ${
                          isSelected
                            ? isSetter ? 'bg-red-600 text-white' : isLibero ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        <span className="text-lg">#{player.number}</span> {player.name}
                        <span className="ml-2 text-sm opacity-75">({roleNames[player.role] || player.role})</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Визуальная схема площадки */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-gray-900 bg-blue-100 p-2 rounded-lg">Площадка:</h3>
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                  <div className="grid grid-cols-3 gap-2">
                    {[4, 3, 2, 5, 6, 1].map(pos => {
                      const playerId = selectedRotation[pos - 1]
                      const player = players.find(p => p.id === playerId)
                      const isSetter = player?.role === 'setter'
                      const isLibero = player?.role === 'libero'
                      
                      return (
                        <div
                          key={pos}
                          className={`p-3 rounded-lg border-2 text-center min-h-[100px] flex flex-col justify-center ${
                            pos === 1 
                              ? isSetter ? 'bg-red-200 border-red-500 ring-4 ring-red-200' : 'bg-yellow-100 border-yellow-400 ring-4 ring-yellow-200'
                              : isSetter ? 'bg-red-100 border-red-500' : isLibero ? 'bg-green-100 border-green-500' : 'bg-white border-blue-400'
                          }`}
                        >
                          <div className="text-xs text-gray-600 mb-1 font-semibold">
                            Зона {pos}{pos === 1 ? ' (Подача)' : ''}
                          </div>
                          {player ? (
                            <div>
                              <div className={`font-bold text-base ${
                                isSetter ? 'text-red-900' : isLibero ? 'text-green-900' : pos === 1 ? 'text-yellow-700' : 'text-blue-900'
                              }`}>
                                #{player.number} {player.name}
                              </div>
                              <div className={`text-xs font-semibold mt-1 ${
                                isSetter ? 'text-red-700' : isLibero ? 'text-green-700' : 'text-gray-600'
                              }`}>
                                {roleNames[player.role] || player.role}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">Пусто</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="mt-3 text-center text-xs text-gray-600">
                    💡 Красный = Связующий, Зелёный = Либеро, Жёлтый = Подача
                  </div>
                </div>

                {/* Кнопки перемещения */}
                {selectedRotation.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-base font-bold text-gray-900 bg-blue-100 p-2 rounded-lg">Переместить игроков:</h4>
                    {selectedRotation.map((playerId, index) => {
                      const player = players.find(p => p.id === playerId)
                      if (!player) return null 
                      const isSetter = player.role === 'setter'
                      const isLibero = player.role === 'libero'
                      
                      return (
                        <div 
                          key={playerId} 
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 ${
                            isSetter 
                              ? 'bg-red-50 border-red-300' 
                              : isLibero 
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-white border-blue-300'
                          }`}
                        >
                          <span className={`flex-1 text-base font-bold ${
                            isSetter ? 'text-red-900' : isLibero ? 'text-green-900' : 'text-gray-900'
                          }`}>
                            #{player.number} {player.name} ({roleNames[player.role]})
                          </span>
                          <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                            Зона {index + 1}
                          </span>
                          <button
                            onClick={() => movePlayerInRotation(playerId, 'up')}
                            disabled={index === 0}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:bg-gray-400"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => movePlayerInRotation(playerId, 'down')}
                            disabled={index === 5}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:bg-gray-400"
                          >
                            ↓
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsSetupOpen(false)}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={saveRotation}
                disabled={selectedRotation.length !== 6}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400"
              >
                Сохранить ({selectedRotation.length}/6)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}