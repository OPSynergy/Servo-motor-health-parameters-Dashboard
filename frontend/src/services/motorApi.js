const API_BASE_URL = 'http://localhost:3001/api'

// Fetch all motors
export const fetchMotors = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/motors`)
    if (!response.ok) {
      throw new Error('Failed to fetch motors')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching motors:', error)
    throw error
  }
}

// Fetch single motor by ID
export const fetchMotor = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/motors/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch motor')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching motor:', error)
    throw error
  }
}

// Create new motor
export const createMotor = async (motorData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/motors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(motorData),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create motor')
    }
    return await response.json()
  } catch (error) {
    console.error('Error creating motor:', error)
    throw error
  }
}

// Update motor
export const updateMotor = async (id, motorData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/motors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(motorData),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update motor')
    }
    return await response.json()
  } catch (error) {
    console.error('Error updating motor:', error)
    throw error
  }
}

// Delete motor
export const deleteMotor = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/motors/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete motor')
    }
    return await response.json()
  } catch (error) {
    console.error('Error deleting motor:', error)
    throw error
  }
}
