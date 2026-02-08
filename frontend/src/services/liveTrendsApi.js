const API_BASE_URL = 'http://localhost:3001/api'

// Save live trend data
export const saveLiveTrend = async (parameter, highLevel, lowLevel, currentValue) => {
  try {
    const response = await fetch(`${API_BASE_URL}/live-trends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parameter,
        highLevel,
        lowLevel,
        currentValue,
      }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save live trend')
    }
    return await response.json()
  } catch (error) {
    console.error('Error saving live trend:', error)
    throw error
  }
}

// Get live trend data
export const getLiveTrends = async (parameter = null, limit = 100) => {
  try {
    const url = new URL(`${API_BASE_URL}/live-trends`)
    if (parameter) url.searchParams.append('parameter', parameter)
    url.searchParams.append('limit', limit)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch live trends')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching live trends:', error)
    throw error
  }
}

// Get latest values for all parameters
export const getLatestTrends = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/live-trends/latest`)
    if (!response.ok) {
      throw new Error('Failed to fetch latest trends')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching latest trends:', error)
    throw error
  }
}

// Get historical data from a specific time period ago
export const getHistoricalTrends = async (parameter, minutesAgo, afterTimestamp = null) => {
  try {
    const url = new URL(`${API_BASE_URL}/live-trends/historical`)
    url.searchParams.append('minutesAgo', minutesAgo)
    if (parameter) {
      url.searchParams.append('parameter', parameter)
    }
    if (afterTimestamp) {
      url.searchParams.append('afterTimestamp', afterTimestamp)
    }
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch historical trends')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching historical trends:', error)
    throw error
  }
}

// Delete all data for a specific parameter
export const deleteAllTrendsForParameter = async (parameter) => {
  try {
    const url = new URL(`${API_BASE_URL}/live-trends`)
    url.searchParams.append('parameter', parameter)
    
    const response = await fetch(url, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete trends')
    }
    return await response.json()
  } catch (error) {
    console.error('Error deleting trends:', error)
    throw error
  }
}
