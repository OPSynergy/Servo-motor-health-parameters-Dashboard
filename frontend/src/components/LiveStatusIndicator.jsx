import { useMotor } from '../context/MotorContext'
import servoMotor from '../assets/servo_motor.png'
import './LiveStatusIndicator.css'

const LiveStatusIndicator = () => {
  const { selectedMotor } = useMotor()
  const motorImage = selectedMotor?.imageUrl || servoMotor

  return (
    <div className="live-status-indicator">
      <img 
        src={motorImage} 
        alt={selectedMotor?.name || "Motor"} 
        className="status-motor-image"
      />
      <div className="status-indicator-content">
        <div className="status-light"></div>
        <span className="status-text">Live</span>
      </div>
    </div>
  )
}

export default LiveStatusIndicator
