import { useState, useEffect } from 'react'
import { FaPencilAlt, FaTrash, FaPlay } from 'react-icons/fa'
import { fetchMotors, createMotor, updateMotor, deleteMotor } from '../services/motorApi'
import { useMotor } from '../context/MotorContext'
import './MotorSetup.css'

// Import motor images
import hkImage from '../assets/hk.jpg'
import hgImage from '../assets/hg.jpg'
import hfImage from '../assets/hf.jpg'
import hfKpImage from '../assets/hf-kp.jpg'
import lmFImage from '../assets/lm-f.jpg'
import tmRbImage from '../assets/tm-rb.jpg'

const MotorSetup = () => {
  const { selectMotor, selectedMotor } = useMotor()
  const [motors, setMotors] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    highLevel: '',
    lowLevel: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMotor, setEditingMotor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get motor image based on model
  const getMotorImage = (model) => {
    const imageMap = {
      'HK Series': hkImage,
      'HG Series': hgImage,
      'HF Series': hfImage,
      'HF-KP Series': hfKpImage,
      'LM-F Series': lmFImage,
      'TM-RB Series': tmRbImage
    }
    return imageMap[model] || hkImage // Default to HK if model not found
  }

  // Convert image to data URL
  const convertImageToDataURL = (imageSrc) => {
    return new Promise((resolve, reject) => {
      // If it's already a data URL, return it
      if (imageSrc.startsWith('data:')) {
        resolve(imageSrc)
        return
      }

      const img = new Image()
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          
          // Fill with white background
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw the image
          ctx.drawImage(img, 0, 0)
          
          // Convert to data URL
          const dataURL = canvas.toDataURL('image/png', 1.0)
          resolve(dataURL)
        } catch (error) {
          console.error('Error converting image to data URL:', error)
          // If conversion fails, try to use the original source
          resolve(imageSrc)
        }
      }
      
      img.onerror = (error) => {
        console.error('Error loading image:', error)
        // If loading fails, try to use the original source
        resolve(imageSrc)
      }
      
      // Set crossOrigin only for external URLs
      if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
        img.crossOrigin = 'anonymous'
      }
      
      img.src = imageSrc
    })
  }

  // Load motors from database on mount
  useEffect(() => {
    const loadMotors = async () => {
      try {
        setLoading(true)
        setError(null)
        const motorsData = await fetchMotors()
        setMotors(motorsData)
      } catch (error) {
        console.error('Error loading motors from database:', error)
        setError('Failed to load motors. Make sure the server is running.')
        setMotors([])
      } finally {
        setLoading(false)
      }
    }
    
    loadMotors()
  }, [])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle add/edit motor
  const handleAddMotor = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.model || !formData.highLevel || !formData.lowLevel) {
      alert('Please fill in all required fields (Motor Model, Motor Name, High Level, and Low Level)')
      return
    }

    try {
      // Get image based on selected model and convert to data URL
      const imageSrc = getMotorImage(formData.model)
      const imageUrl = await convertImageToDataURL(imageSrc)

      if (editingMotor) {
        // Update existing motor in database
        const updatedMotor = await updateMotor(editingMotor.id, {
          name: formData.name,
          model: formData.model,
          type: 'Servo', // Keep type for backward compatibility
          voltage: 'N/A', // Keep voltage for backward compatibility (required by backend)
          highLevel: formData.highLevel ? parseFloat(formData.highLevel) : null,
          lowLevel: formData.lowLevel ? parseFloat(formData.lowLevel) : null,
          imageUrl: imageUrl
        })
        
        // Update local state
        setMotors(prev => prev.map(motor => 
          motor.id === editingMotor.id ? updatedMotor : motor
        ))
      } else {
        // Create new motor in database
        const newMotor = await createMotor({
          name: formData.name,
          model: formData.model,
          type: 'Servo', // Keep type for backward compatibility
          voltage: 'N/A', // Keep voltage for backward compatibility (required by backend)
          highLevel: formData.highLevel ? parseFloat(formData.highLevel) : null,
          lowLevel: formData.lowLevel ? parseFloat(formData.lowLevel) : null,
          imageUrl: imageUrl
        })
        
        // Add to local state
        setMotors(prev => [...prev, newMotor])
      }
      
      // Reset form
      setFormData({
        name: '',
        model: '',
        highLevel: '',
        lowLevel: ''
      })
      setShowAddForm(false)
      setEditingMotor(null)
    } catch (error) {
      console.error('Error saving motor:', error)
      alert('Failed to save motor. Please try again.')
    }
  }

  // Handle cancel form
  const handleCancelForm = () => {
    setShowAddForm(false)
    setFormData({
      name: '',
      model: '',
      highLevel: '',
      lowLevel: ''
    })
    setEditingMotor(null)
  }

  // Handle delete motor
  const handleDeleteMotor = async (id) => {
    if (window.confirm('Are you sure you want to delete this motor?')) {
      try {
        await deleteMotor(id)
        // Remove from local state
        setMotors(prev => prev.filter(motor => motor.id !== id))
        // Clear selection if the deleted motor was selected
        if (selectedMotor?.id === id) {
          selectMotor(null)
        }
      } catch (error) {
        console.error('Error deleting motor:', error)
        alert(error.message || 'Failed to delete motor. Please try again.')
      }
    }
  }

  // Handle configure motor
  const handleConfigure = (motor) => {
    alert(`Configuring ${motor.name}...\n\nThis feature will open the motor configuration panel.`)
  }

  // Handle edit motor - opens edit form with motor data pre-filled
  const handleEditMotor = (motor) => {
    setEditingMotor(motor)
    setFormData({
      name: motor.name || '',
      model: motor.model || '',
      highLevel: motor.highLevel ? motor.highLevel.toString() : '',
      lowLevel: motor.lowLevel ? motor.lowLevel.toString() : ''
    })
    setShowAddForm(true)
  }

  // Handle image error - fallback to placeholder
  const handleImageError = (e, motorName) => {
    e.target.src = `https://placehold.co/300x200/6B7280/FFFFFF?text=${encodeURIComponent(motorName)}`
  }

  return (
    <div className="motor-setup-container">
      <div className="motor-setup-content">
        <h1 className="motor-setup-title">Motor Setup</h1>
        
        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: '8px', 
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}
        
        {loading && (
          <div style={{ 
            padding: '12px', 
            textAlign: 'center', 
            marginBottom: '20px' 
          }}>
            Loading motors...
          </div>
        )}
        
        {/* Add Motor Button */}
        {!showAddForm && (
          <div className="add-motor-button-container">
            <button 
              className="add-motor-button"
              onClick={() => {
                setEditingMotor(null)
                setShowAddForm(true)
              }}
              aria-label="Add Motor"
            >
              <span className="add-button-icon">+</span>
              <span className="add-button-text">Add Motor</span>
            </button>
          </div>
        )}

        {/* Add/Edit Motor Form */}
        {showAddForm && (
          <div className="add-motor-section">
            <div className="form-header">
              <h2 className="section-title">{editingMotor ? 'Edit Motor' : 'Add New Motor'}</h2>
              <button 
                type="button"
                className="close-form-btn"
                onClick={handleCancelForm}
                aria-label="Close Form"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddMotor} className="add-motor-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="model">Motor Model *</label>
                  <select
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Motor Model</option>
                    <option value="HK Series">HK Series</option>
                    <option value="HG Series">HG Series</option>
                    <option value="HF Series">HF Series</option>
                    <option value="HF-KP Series">HF-KP Series</option>
                    <option value="LM-F Series">LM-F Series</option>
                    <option value="TM-RB Series">TM-RB Series</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="name">Motor Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Motor 1"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="highLevel">Motor Rating - High Level (HL) *</label>
                  <input
                    type="number"
                    id="highLevel"
                    name="highLevel"
                    value={formData.highLevel}
                    onChange={handleInputChange}
                    placeholder="Enter High Level"
                    step="0.01"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="lowLevel">Motor Rating - Low Level (LL) *</label>
                  <input
                    type="number"
                    id="lowLevel"
                    name="lowLevel"
                    value={formData.lowLevel}
                    onChange={handleInputChange}
                    placeholder="Enter Low Level"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              {formData.model && (
                <div className="form-row">
                  <div className="form-group" style={{ width: '100%' }}>
                    <label>Motor Image Preview</label>
                    <div className="motor-image-preview" style={{ 
                      marginTop: '10px',
                      padding: '15px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '200px'
                    }}>
                      <img 
                        src={getMotorImage(formData.model)} 
                        alt={`${formData.model} Motor`}
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: '300px',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                    <p style={{ 
                      marginTop: '8px',
                      fontSize: '0.85rem',
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      Image will be automatically selected based on Motor Model
                    </p>
                  </div>
                </div>
              )}
              
              <div className="form-actions">
                <button type="button" onClick={handleCancelForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="add-motor-btn">
                  {editingMotor ? 'Update Motor' : 'Add Motor'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Motors Grid */}
        <div className="motors-section">
          <div className="motors-grid">
            {motors.map((motor) => (
              <div key={motor.id} className="motor-item">
                <div className="motor-hover-buttons">
                  <button
                    onClick={() => selectMotor(motor)}
                    className={`monitor-btn ${selectedMotor?.id === motor.id ? 'active' : ''}`}
                    title="Select Motor for Monitoring"
                  >
                    <FaPlay />
                  </button>
                  <button
                    onClick={() => handleEditMotor(motor)}
                    className="edit-btn"
                    title="Edit Motor"
                  >
                    <FaPencilAlt />
                  </button>
                  {!motor.isDefault && (
                    <button
                      onClick={() => handleDeleteMotor(motor.id)}
                      className="delete-btn"
                      title="Delete Motor"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
                <div className="motor-image-wrapper">
                  <div style={{ background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '200px' }}>
                    <img
                      src={motor.imageUrl}
                      alt={motor.name}
                      className="motor-image"
                      onError={(e) => handleImageError(e, motor.name)}
                      style={{ backgroundColor: 'white', display: 'block', maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                    />
                  </div>
                </div>
                <div className="motor-name-label">{motor.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MotorSetup
