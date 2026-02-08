import './Page.css'
import coepLogo from '../assets/COEP Technological University_idegns7t2n_0.png'
import rightLogo from '../assets/mitsubishi-electric-changes-for-the-better-logo-png_seeklogo-93542-removebg-preview.png'

const Home = () => {
  return (
    <div className="page-container">
      <div className="home-logo-container">
        <img 
          src={coepLogo} 
          alt="COEP Technological University Logo" 
          className="home-logo"
        />
      </div>
      
      <div className="home-header-center">
        <h1 className="team-name">TEAM PEGASUS</h1>
        <p className="team-number">MEC2526273</p>
        <h2 className="topic-name">Predictive Maintenance For Servo Motors</h2>
      </div>
      
      <div className="home-logo-container-right">
        <img 
          src={rightLogo}
          alt="Right Logo" 
          className="home-logo"
        />
      </div>
      
      <div className="page-content">
      
      </div>
    </div>
  )
}

export default Home