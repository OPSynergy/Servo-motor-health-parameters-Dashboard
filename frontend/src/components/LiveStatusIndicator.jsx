import { useMotor } from '../context/MotorContext'
import './LiveStatusIndicator.css'

const LiveStatusIndicator = () => {
  const { selectedMotor } = useMotor()
  const isConnected = !!selectedMotor

  return (
    <div className="live-status-indicator">
      {isConnected && selectedMotor?.imageUrl && (
        <img 
          src={selectedMotor.imageUrl} 
          alt={selectedMotor.name} 
          className="status-motor-image"
        />
      )}
      <div className="status-indicator-content">
        <div className={`status-light ${isConnected ? 'connected' : 'disconnected'}`}></div>
        <span className={`status-text ${isConnected ? 'connected-text' : 'disconnected-text'}`}>
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>
    </div>
  )
}

export default LiveStatusIndicator
