const API_BASE_URL = 'http://localhost:3001/api'

export const getPredictiveData = async (limit = 500) => {
  const url = `${API_BASE_URL}/predictive-data${limit ? `?limit=${limit}` : ''}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch predictive data')
  return response.json()
}
