const API_BASE_URL = 'http://localhost:3001/api'

export const getAlarms = async () => {
  const response = await fetch(`${API_BASE_URL}/alarms`)
  if (!response.ok) throw new Error('Failed to fetch alarms')
  return response.json()
}

export const getAlarmsCount = async () => {
  const response = await fetch(`${API_BASE_URL}/alarms/count`)
  if (!response.ok) throw new Error('Failed to fetch alarm count')
  const data = await response.json()
  return data.count
}
