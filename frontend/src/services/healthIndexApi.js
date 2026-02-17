const API_BASE_URL = 'http://localhost:3001/api'

export const getHealthIndex = async () => {
  const response = await fetch(`${API_BASE_URL}/health-index`)
  if (!response.ok) throw new Error('Failed to fetch health index')
  return response.json()
}
