import { createCanvas, loadImage } from 'canvas'
import type { ImageValidationResult } from './types/validation'

// Basic heuristics for landscape/terrain detection
export async function isLandscapeImage(imageBuffer: Buffer): Promise<ImageValidationResult> {
  try {
    // Load image
    const image = await loadImage(imageBuffer)
    
    // Check image dimensions
    if (image.width < 224 || image.height < 224) {
      return {
        isValid: false,
        confidence: 0,
        message: "Image is too small. Minimum dimensions are 224x224 pixels."
      }
    }

    // Create canvas and draw image
    const canvas = createCanvas(224, 224)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, 224, 224)

    // Get image data
    const imageData = ctx.getImageData(0, 0, 224, 224)
    const data = imageData.data

    // Simple heuristics for landscape detection:
    // 1. Color distribution analysis
    let browns = 0 // earth tones
    let greens = 0 // vegetation
    let blues = 0  // water/sky
    let grays = 0  // rocks/urban
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Check for earth tones (browns)
      if (r > g && r > b && g > b) browns++
      
      // Check for vegetation (greens)
      if (g > r && g > b) greens++
      
      // Check for water/sky (blues)
      if (b > r && b > g) blues++
      
      // Check for rocks/urban (grays)
      if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) grays++
    }

    const totalPixels = (224 * 224)
    const brownRatio = browns / totalPixels
    const greenRatio = greens / totalPixels
    const blueRatio = blues / totalPixels
    const grayRatio = grays / totalPixels
    
    // Calculate confidence based on color distribution
    // We expect landscapes to have a mix of these colors
    const hasSignificantNaturalColors = (brownRatio > 0.1 || greenRatio > 0.1 || blueRatio > 0.1)
    const hasBalancedDistribution = (brownRatio + greenRatio + blueRatio + grayRatio) > 0.5

    // Additional heuristics to catch non-land images (humans, cartoons)
    let skinToneApprox = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const saturation = max === 0 ? 0 : (max - min) / max
      // crude skin tone band
      if (r > 95 && g > 40 && b > 20 && (max - min) > 15 && r > g && r > b) {
        skinToneApprox++
      }
      // highly saturated primary color dominance (cartoonish)
      if (saturation > 0.6 && (r > 200 || g > 200 || b > 200)) {
        skinToneApprox++
      }
    }
    const skinRatio = skinToneApprox / totalPixels

    // Confidence score (0-1)
    const confidence = Math.max(0, Math.min(1, (brownRatio + greenRatio + blueRatio + grayRatio) / 2 - skinRatio / 3))

    const likelyNonLand = skinRatio > 0.08 && (greenRatio < 0.08 && blueRatio < 0.08)
    const isValid = hasSignificantNaturalColors && hasBalancedDistribution && !likelyNonLand

    return {
      isValid,
      confidence,
      message: isValid 
        ? "Valid landscape/terrain image detected"
        : (likelyNonLand
          ? "This image appears to contain people, cartoons, or non-land content. Please upload a land/terrain/satellite image."
          : "The image doesn't appear to be a landscape or terrain image. Please upload a land/terrain/satellite image.")
    }
  } catch (error) {
    console.error('Image validation error:', error)
    return {
      isValid: false,
      confidence: 0,
      message: "Error validating image. Please ensure you're uploading a valid image file."
    }
  }
}

// Helper function to convert base64 to buffer
export function base64ToBuffer(base64: string): Buffer {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}
