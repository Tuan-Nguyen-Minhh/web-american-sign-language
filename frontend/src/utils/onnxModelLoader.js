/**
 * ONNX Model Loader for YOLOv8 ASL Detection
 * Handles loading and running YOLO model inference in the browser
 */

import * as ort from 'onnxruntime-web';

class YOLOModelLoader {
  constructor() {
    this.session = null;
    this.modelPath = '/models/best.onnx'; // or best.onnx
    this.inputSize = 640; // YOLOv8 standard input size
    this.isLoaded = false;
  }

  /**
   * Load the ONNX model
   */
  async loadModel(modelPath = null) {
    try {
      const path = modelPath || this.modelPath;
      console.log('Loading ONNX model from:', path);
      
      // Configure ONNX Runtime - updated to match installed version
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
      
      // Additional ONNX Runtime configuration
      ort.env.wasm.numThreads = 1; // Single thread for better compatibility
      
      // Create inference session with better error handling
      this.session = await ort.InferenceSession.create(path, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      
      this.isLoaded = true;
      console.log('✅ ONNX model loaded successfully');
      console.log('Model inputs:', this.session.inputNames);
      console.log('Model outputs:', this.session.outputNames);
      
      return true;
    } catch (error) {
      console.error('❌ Error loading ONNX model:', error);
      console.error('Error details:', error.message);
      console.error('Make sure the model file exists at:', this.modelPath);
      console.error('Try running: python convert_model_to_onnx.py');
      this.isLoaded = false;
      return false;
    }
  }

  /**
   * Preprocess image for YOLO model
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} image 
   * @returns {Object} Preprocessed tensor and metadata
   */
  preprocessImage(image) {
    try {
      // Create canvas to resize image
      const canvas = document.createElement('canvas');
      canvas.width = this.inputSize;
      canvas.height = this.inputSize;
      const ctx = canvas.getContext('2d');
      
      // Draw and resize image
      ctx.drawImage(image, 0, 0, this.inputSize, this.inputSize);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, this.inputSize, this.inputSize);
      const pixels = imageData.data;
      
      // Convert to float32 and normalize (RGB format, values 0-1)
      const float32Data = new Float32Array(3 * this.inputSize * this.inputSize);
      
      // YOLOv8 expects CHW format (channels, height, width) with normalization
      for (let i = 0; i < pixels.length; i += 4) {
        const pixelIndex = i / 4;
        const row = Math.floor(pixelIndex / this.inputSize);
        const col = pixelIndex % this.inputSize;
        
        // Normalize to 0-1 range and convert to CHW format
        float32Data[row * this.inputSize + col] = pixels[i] / 255.0; // R
        float32Data[this.inputSize * this.inputSize + row * this.inputSize + col] = pixels[i + 1] / 255.0; // G
        float32Data[2 * this.inputSize * this.inputSize + row * this.inputSize + col] = pixels[i + 2] / 255.0; // B
      }
      
      // Create tensor
      const tensor = new ort.Tensor('float32', float32Data, [1, 3, this.inputSize, this.inputSize]);
      
      return {
        tensor,
        originalWidth: image.width || image.videoWidth,
        originalHeight: image.height || image.videoHeight
      };
    } catch (error) {
      console.error('Error preprocessing image:', error);
      return null;
    }
  }

  /**
   * Post-process YOLO output to extract detections
   * @param {Object} output - Model output tensor
   * @param {number} originalWidth - Original image width
   * @param {number} originalHeight - Original image height
   * @param {number} confThreshold - Confidence threshold (default 0.3)
   * @returns {Array} Array of detection objects
   */
  postprocessOutput(output, originalWidth, originalHeight, confThreshold = 0.3) {
    try {
      const outputData = output.data;
      const detections = [];
      
      // Debug: Log output shape
      console.log('Output shape:', output.dims);
      console.log('Output data length:', outputData.length);
      
      // YOLOv8 output format analysis
      const dims = output.dims;
      const rows = dims[1]; // Number of values per detection
      const numPredictions = dims[2]; // Number of predictions (8400)
      
      console.log(`YOLOv8 output: ${rows} values per detection, ${numPredictions} total predictions`);
      
      // For YOLOv8: rows = 4 (bbox) + num_classes
      // Single class: rows = 5 (x, y, w, h, class0_score)
      // Multi class: rows = 84 (x, y, w, h, + 80 class scores for COCO)
      const numClasses = rows - 4;
      console.log(`Number of classes: ${numClasses}`);
      
      // Sample first few predictions for debugging
      console.log('Sample prediction 0:', {
        x: outputData[0],
        y: outputData[numPredictions],
        w: outputData[2 * numPredictions],
        h: outputData[3 * numPredictions],
        score: outputData[4 * numPredictions]
      });
      
      for (let i = 0; i < numPredictions; i++) {
        // Get bbox coordinates (in XYXY or XYWH format depending on export)
        const x = outputData[0 * numPredictions + i];
        const y = outputData[1 * numPredictions + i];
        const w = outputData[2 * numPredictions + i];
        const h = outputData[3 * numPredictions + i];
        
        // Get class scores
        let maxScore = 0;
        let maxClass = 0;
        
        for (let c = 0; c < numClasses; c++) {
          const score = outputData[(4 + c) * numPredictions + i];
          if (score > maxScore) {
            maxScore = score;
            maxClass = c;
          }
        }
        
        // Filter by confidence threshold
        if (maxScore >= confThreshold) {
          // Convert to corner coordinates and scale to original image size
          const scaleX = originalWidth / this.inputSize;
          const scaleY = originalHeight / this.inputSize;
          
          // Check if coordinates are already in pixel space or normalized
          // YOLOv8 ONNX typically outputs in pixel space (0-640)
          const x1 = Math.max(0, Math.round((x - w / 2) * scaleX));
          const y1 = Math.max(0, Math.round((y - h / 2) * scaleY));
          const x2 = Math.min(originalWidth, Math.round((x + w / 2) * scaleX));
          const y2 = Math.min(originalHeight, Math.round((y + h / 2) * scaleY));
          
          detections.push({
            bbox: [x1, y1, x2, y2],
            confidence: maxScore,
            class: maxClass,
            class_name: maxClass === 0 ? "hand" : `class_${maxClass}`
          });
        }
      }
      
      console.log(`Found ${detections.length} detections before NMS (threshold: ${confThreshold})`);
      if (detections.length > 0) {
        console.log('Top 3 detections:', detections.slice(0, 3));
      }
      
      // Apply NMS (Non-Maximum Suppression) to remove overlapping boxes
      const finalDetections = this.applyNMS(detections, 0.45);
      console.log(`Final detections after NMS: ${finalDetections.length}`);
      if (finalDetections.length > 0) {
        console.log('Final top detection:', finalDetections[0]);
      }
      
      return finalDetections;
    } catch (error) {
      console.error('Error post-processing output:', error);
      return [];
    }
  }

  /**
   * Apply Non-Maximum Suppression to remove overlapping detections
   */
  applyNMS(detections, iouThreshold = 0.45) {
    if (detections.length === 0) return [];
    
    // Sort by confidence (descending)
    detections.sort((a, b) => b.confidence - a.confidence);
    
    const keep = [];
    const suppressed = new Set();
    
    for (let i = 0; i < detections.length; i++) {
      if (suppressed.has(i)) continue;
      
      keep.push(detections[i]);
      
      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed.has(j)) continue;
        
        const iou = this.calculateIOU(detections[i].bbox, detections[j].bbox);
        if (iou > iouThreshold) {
          suppressed.add(j);
        }
      }
    }
    
    return keep;
  }

  /**
   * Calculate Intersection over Union (IOU) between two bounding boxes
   */
  calculateIOU(box1, box2) {
    const [x1_1, y1_1, x2_1, y2_1] = box1;
    const [x1_2, y1_2, x2_2, y2_2] = box2;
    
    const xA = Math.max(x1_1, x1_2);
    const yA = Math.max(y1_1, y1_2);
    const xB = Math.min(x2_1, x2_2);
    const yB = Math.min(y2_1, y2_2);
    
    const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    
    const box1Area = (x2_1 - x1_1) * (y2_1 - y1_1);
    const box2Area = (x2_2 - x1_2) * (y2_2 - y1_2);
    
    const unionArea = box1Area + box2Area - intersectionArea;
    
    return intersectionArea / unionArea;
  }

  /**
   * Run inference on an image
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} image 
   * @returns {Object} Detection results
   */
  async detect(image) {
    if (!this.isLoaded || !this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }
    
    try {
      // Preprocess image
      const preprocessed = this.preprocessImage(image);
      if (!preprocessed) {
        throw new Error('Failed to preprocess image');
      }
      
      // Run inference
      const feeds = { images: preprocessed.tensor };
      const results = await this.session.run(feeds);
      
      // Get output (typically 'output0' or 'output')
      const outputName = this.session.outputNames[0];
      const output = results[outputName];
      
      // Post-process results
      const detections = this.postprocessOutput(
        output,
        preprocessed.originalWidth,
        preprocessed.originalHeight,
        0.15 // Very low threshold to see any detections
      );
      
      return {
        success: true,
        detections,
        total_hands: detections.length,
        prediction: detections.length > 0 ? detections[0].class_name : "No gesture detected",
        confidence: detections.length > 0 ? detections[0].confidence : 0
      };
    } catch (error) {
      console.error('Error during detection:', error);
      return {
        success: false,
        error: error.message,
        detections: [],
        total_hands: 0
      };
    }
  }

  /**
   * Unload the model and free resources
   */
  async unload() {
    if (this.session) {
      // ONNX Runtime Web will handle cleanup
      this.session = null;
      this.isLoaded = false;
      console.log('Model unloaded');
    }
  }
}

// Export singleton instance
export const yoloModel = new YOLOModelLoader();
export default YOLOModelLoader;
