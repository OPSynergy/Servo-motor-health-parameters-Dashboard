import { createContext, useContext, useState, useEffect } from 'react'

const MotorContext = createContext()

export const useMotor = () => {
  const context = useContext(MotorContext)
  if (!context) {
    throw new Error('useMotor must be used within a MotorProvider')
  }
  return context
}

export const MotorProvider = ({ children }) => {
  const [selectedMotor, setSelectedMotor] = useState(null)

  // Load selected motor from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedMotor')
    if (stored) {
      try {
        setSelectedMotor(JSON.parse(stored))
      } catch (e) {
        console.error('Error loading selected motor:', e)
      }
    }
  }, [])

  const selectMotor = (motor) => {
    setSelectedMotor(motor)
    // Store in localStorage for persistence
    if (motor) {
      localStorage.setItem('selectedMotor', JSON.stringify(motor))
    } else {
      localStorage.removeItem('selectedMotor')
    }
  }

  return (
    <MotorContext.Provider value={{ selectedMotor, selectMotor }}>
      {children}
    </MotorContext.Provider>
  )
}
