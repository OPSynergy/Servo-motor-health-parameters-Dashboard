import { useState, useEffect } from 'react'
import './MotorSetup.css'

const MotorSetup = () => {
  const [motors, setMotors] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    type: 'Servo',
    voltage: ''
  })
  const [uploadedImage, setUploadedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Default motors
  const defaultMotors = [
    {
      id: '1',
      name: 'NEMA 17 Stepper',
      type: 'Stepper',
      voltage: '12V',
      imageUrl: 'https://placehold.co/300x200/4F46E5/FFFFFF?text=NEMA+17+Stepper',
      isDefault: true
    },
    {
      id: '2',
      name: 'MG995 Servo',
      type: 'Servo',
      voltage: '5V',
      imageUrl: 'https://placehold.co/300x200/10B981/FFFFFF?text=MG995+Servo',
      isDefault: true
    },
    {
      id: '3',
      name: 'DC Gear Motor',
      type: 'DC',
      voltage: '12-24V',
      imageUrl: 'https://placehold.co/300x200/F59E0B/FFFFFF?text=DC+Gear+Motor',
      isDefault: true
    }
  ]

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

  // Process existing motor images to add white background
  // This processes images already stored in localStorage
  const processExistingMotors = async (motors) => {
    return Promise.all(
      motors.map(async (motor) => {
        // Skip if it's an external URL (placeholder or external image)
        if (motor.imageUrl.startsWith('http://') || motor.imageUrl.startsWith('https://')) {
          return motor
        }
        
        // Process data URLs (uploaded images) to ensure they have white backgrounds
        if (motor.imageUrl.startsWith('data:image')) {
          try {
            const processedUrl = await processImageWithWhiteBackground(motor.imageUrl)
            return { ...motor, imageUrl: processedUrl }
          } catch (error) {
            console.error('Error processing existing motor image:', error)
            return motor // Return original if processing fails
          }
        }
        
        return motor
      })
    )
  }

  // Load motors from localStorage on mount
  useEffect(() => {
    try {
      const savedMotors = localStorage.getItem('motors')
      if (savedMotors) {
        const parsedMotors = JSON.parse(savedMotors)
        // Process existing images to add white background
        processExistingMotors(parsedMotors).then((processedMotors) => {
          setMotors(processedMotors)
          // Update localStorage with processed images
          localStorage.setItem('motors', JSON.stringify(processedMotors))
        })
      } else {
        setMotors(defaultMotors)
      }
    } catch (error) {
      console.error('Error loading motors from localStorage:', error)
      setMotors(defaultMotors)
    }
  }, [])

  // Save motors to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('motors', JSON.stringify(motors))
    } catch (error) {
      console.error('Error saving motors to localStorage:', error)
    }
  }, [motors])

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

  // Handle add motor
  const handleAddMotor = (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.voltage) {
      alert('Please fill in all required fields (Name and Voltage)')
      return
    }

    // Use uploaded image (data URL - already processed with white background) if available, otherwise use placeholder
    let imageUrl = imagePreview || `https://placehold.co/300x200/6B7280/FFFFFF?text=${encodeURIComponent(formData.name)}`

    const newMotor = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      voltage: formData.voltage,
      imageUrl: imageUrl,
      isDefault: false
    }

    setMotors(prev => [...prev, newMotor])
    
    // Reset form
    setFormData({
      name: '',
      type: 'Servo',
      voltage: ''
    })
    setUploadedImage(null)
    setImagePreview(null)
    setShowAddForm(false)
    
    // Reset file input
    const fileInput = document.getElementById('imageFile')
    if (fileInput) {
      fileInput.value = ''
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
    
    // Reset file input
    const fileInput = document.getElementById('imageFile')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Handle delete motor
  const handleDeleteMotor = (id) => {
    if (window.confirm('Are you sure you want to delete this motor?')) {
      setMotors(prev => prev.filter(motor => motor.id !== id))
    }
  }

  // Handle configure motor
  const handleConfigure = (motor) => {
    alert(`Configuring ${motor.name}...\n\nThis feature will open the motor configuration panel.`)
  }

  // Handle edit motor
  const handleEditMotor = (motor) => {
    alert(`Editing ${motor.name}...\n\nThis feature will open the motor edit panel.`)
  }

  // Handle image error - fallback to placeholder
  const handleImageError = (e, motorName) => {
    e.target.src = `https://placehold.co/300x200/6B7280/FFFFFF?text=${encodeURIComponent(motorName)}`
  }

  return (
    <div className="motor-setup-container">
      <div className="motor-setup-content">
        <h1 className="motor-setup-title">Motor Setup</h1>
        
        {/* Add Motor Button */}
        {!showAddForm && (
          <div className="add-motor-button-container">
            <button 
              className="add-motor-button"
              onClick={() => setShowAddForm(true)}
              aria-label="Add Motor"
            >
              <span className="add-button-icon">+</span>
              <span className="add-button-text">Add Motor</span>
            </button>
          </div>
        )}

        {/* Add Motor Form */}
        {showAddForm && (
          <div className="add-motor-section">
            <div className="form-header">
              <h2 className="section-title">Add New Motor</h2>
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
                  Add Motor
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Motors Grid */}
        <div className="motors-section">
          <div className="motors-grid">
            {motors.map((motor) => (
              <div key={motor.id} className="motor-image-wrapper">
                <div className="motor-hover-buttons">
                  <button
                    onClick={() => handleEditMotor(motor)}
                    className="edit-btn"
                    title="Edit Motor"
                  >
                    Edit
                  </button>
                  {!motor.isDefault && (
                    <button
                      onClick={() => handleDeleteMotor(motor.id)}
                      className="delete-btn"
                      title="Delete Motor"
                    >
                      Delete
                    </button>
                  )}
                </div>
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MotorSetup
