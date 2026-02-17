import './Page.css'

const Alarms = () => {
  return (
    <div
      className="page-container alarms-page"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#ffffff',
        zIndex: 1,
        pointerEvents: 'auto'
      }}
    />
  )
}

export default Alarms
