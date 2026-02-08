import { useState, useEffect } from 'react'
import { FaPencilAlt, FaTrash, FaPlay } from 'react-icons/fa'
import { fetchMotors, createMotor, updateMotor, deleteMotor } from '../services/motorApi'
import { useMotor } from '../context/MotorContext'
import './MotorSetup.css'

const MotorSetup = () => {
  const { selectMotor, selectedMotor } = useMotor()
  const [motors, setMotors] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    type: 'Servo',
    voltage: ''
  })
  const [uploadedImage, setUploadedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMotor, setEditingMotor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Process image to remove transparency and add white background using Canvas API
  // This function handles RGBA, PNG with transparency, and converts to RGB with white background
  const processImageWithWhiteBackground = (imageSrc, callback) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      // Set crossOrigin to handle CORS if needed
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          // Create canvas with same dimensions as image
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          
          // Fill entire canvas with white background first
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw the image on top of white background
          // This automatically composites transparent pixels with white
          ctx.drawImage(img, 0, 0)
          
          // Convert canvas to PNG data URL (PNG preserves quality)
          // This will have white background instead of transparency
          const processedImageUrl = canvas.toDataURL('image/png', 1.0)
          
          if (callback) {
            callback(processedImageUrl)
          }
          resolve(processedImageUrl)
        } catch (error) {
          console.error('Error processing image:', error)
          // If processing fails, return original
          if (callback) {
            callback(imageSrc)
          }
          reject(error)
        }
      }
      
      img.onerror = (error) => {
        console.error('Error loading image:', error)
        // If image fails to load, return original
        if (callback) {
          callback(imageSrc)
        }
        reject(error)
      }
      
      // Load the image
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

  // Handle file upload - automatically processes images to remove transparency
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      return
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }
    
    // Store original file reference
    setUploadedImage(file)
    
    try {
      // Read file as data URL
      const reader = new FileReader()
      
      reader.onloadend = async () => {
        try {
          const originalDataUrl = reader.result
          
          // Process image to remove transparency and add white background
          // This happens automatically after upload, before preview/display
          const processedUrl = await processImageWithWhiteBackground(originalDataUrl)
          
          // Set the processed image as preview (with white background)
          setImagePreview(processedUrl)
        } catch (error) {
          console.error('Error processing image:', error)
          // Fallback to original if processing fails
          const reader = new FileReader()
          reader.onloadend = () => {
            setImagePreview(reader.result)
          }
          reader.readAsDataURL(file)
        }
      }
      
      reader.onerror = () => {
        alert('Error reading image file')
      }
      
      // Start reading the file
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error handling file upload:', error)
      alert('Error processing image. Please try again.')
    }
  }

  // Clear uploaded image
  const handleClearImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
    // Reset file input
    const fileInput = document.getElementById('imageFile')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Handle add/edit motor
  const handleAddMotor = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.voltage) {
      alert('Please fill in all required fields (Name and Voltage)')
      return
    }

    // Use uploaded image (data URL - already processed with white background) if available
    // For editing: keep original image if no new image was uploaded
    let imageUrl
    if (editingMotor) {
      // If editing and a new image was uploaded (imagePreview changed from original), use it
      // Otherwise, keep the original image
      imageUrl = (uploadedImage && imagePreview !== editingMotor.imageUrl) 
        ? imagePreview 
        : editingMotor.imageUrl
    } else {
      // For new motor, use preview or placeholder
      imageUrl = imagePreview || `https://placehold.co/300x200/6B7280/FFFFFF?text=${encodeURIComponent(formData.name)}`
    }

    try {
      if (editingMotor) {
        // Update existing motor in database
        const updatedMotor = await updateMotor(editingMotor.id, {
          name: formData.name,
          type: formData.type,
          voltage: formData.voltage,
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
          type: formData.type,
          voltage: formData.voltage,
          imageUrl: imageUrl
        })
        
        // Add to local state
        setMotors(prev => [...prev, newMotor])
      }
      
      // Reset form
      setFormData({
        name: '',
        type: 'Servo',
        voltage: ''
      })
      setUploadedImage(null)
      setImagePreview(null)
      setShowAddForm(false)
      setEditingMotor(null)
      
      // Reset file input
      const fileInput = document.getElementById('imageFile')
      if (fileInput) {
        fileInput.value = ''
      }
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
      type: 'Servo',
      voltage: ''
    })
    setUploadedImage(null)
    setImagePreview(null)
    setEditingMotor(null)
    
    // Reset file input
    const fileInput = document.getElementById('imageFile')
    if (fileInput) {
      fileInput.value = ''
    }
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
      name: motor.name,
      type: motor.type,
      voltage: motor.voltage
    })
    setImagePreview(motor.imageUrl)
    setUploadedImage(null)
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
                  <label htmlFor="name">Motor Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., NEMA 23 Stepper"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="type">Type</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                  >
                    <option value="Servo">Servo</option>
                    <option value="Stepper">Stepper</option>
                    <option value="DC">DC</option>
                    <option value="Brushless">Brushless</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="voltage">Voltage *</label>
                  <input
                    type="text"
                    id="voltage"
                    name="voltage"
                    value={formData.voltage}
                    onChange={handleInputChange}
                    placeholder="e.g., 12V, 5V, 12-24V"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="imageFile">Upload Image (Optional)</label>
                  <input
                    type="file"
                    id="imageFile"
                    name="imageFile"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="file-input"
                  />
                  {imagePreview && (
                    <div className="image-preview-container" style={{ backgroundColor: 'white' }}>
                      <div style={{ background: 'white', display: 'inline-block' }}>
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="image-preview" 
                          style={{ backgroundColor: 'white', display: 'block' }}
                        />
                      </div>
                      <button type="button" onClick={handleClearImage} className="clear-image-btn">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
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
