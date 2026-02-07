import React from 'react'
import './MotorSetup.css'

class MotorSetup extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      motors: [],
      showForm: false,
      motorName: '',
      motorImage: null
    }
  }

  handleAddClick = () => {
    alert('Add button clicked!') // Test if click works
    this.setState({ showForm: true })
  }

  handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        this.setState({ motorImage: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  handleNameChange = (e) => {
    this.setState({ motorName: e.target.value })
  }

  handleSave = (e) => {
    e.preventDefault()
    const { motorName, motorImage, motors } = this.state

    if (motorName && motorImage) {
      const newMotor = {
        id: Date.now(),
        name: motorName,
        image: motorImage
      }

      this.setState({
        motors: [...motors, newMotor],
        showForm: false,
        motorName: '',
        motorImage: null
      })
    } else {
      alert('Please add both image and name')
    }
  }

  handleCancel = () => {
    this.setState({
      showForm: false,
      motorName: '',
      motorImage: null
    })
  }

  render() {
    const { motors, showForm, motorName, motorImage } = this.state

    return (
      <div className="motor-setup-container">
        <h1 className="page-title">Motor Setup</h1>

        <div className="motors-grid">
          {/* Existing Motors */}
          {motors.map((motor) => (
            <div key={motor.id} className="motor-card">
              <div className="motor-image">
                <img src={motor.image} alt={motor.name} />
              </div>
              <h3 className="motor-name">{motor.name}</h3>
            </div>
          ))}

          {/* Add Button or Form */}
          {!showForm ? (
            <div className="add-motor-card">
              <button 
                className="add-motor-btn"
                onClick={this.handleAddClick}
                type="button"
              >
                <div className="plus-icon">+</div>
                <div className="add-text">Add Motor</div>
              </button>
            </div>
          ) : (
            <div className="motor-form-card">
              <h3 className="form-title">Add New Motor</h3>

              <form onSubmit={this.handleSave}>
                <div className="form-group">
                  <label className="image-upload-label">
                    {motorImage ? (
                      <img src={motorImage} alt="Preview" className="preview-img" />
                    ) : (
                      <div className="upload-placeholder">
                        <div className="upload-icon">📷</div>
                        <span>Click to Upload</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={this.handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="motor-name-input"
                    placeholder="Motor Name"
                    value={motorName}
                    onChange={this.handleNameChange}
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-cancel"
                    onClick={this.handleCancel}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-save"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'black',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 9999
        }}>
          <div>Motors: {motors.length}</div>
          <div>Form: {showForm ? 'OPEN' : 'CLOSED'}</div>
          <div>Name: {motorName || 'empty'}</div>
        </div>
      </div>
    )
  }
}

export default MotorSetup