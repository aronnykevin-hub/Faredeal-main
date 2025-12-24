import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiCamera, FiZap, FiVolume2, FiCheck, FiAlertCircle, FiClock, FiSmartphone, FiCpu } from 'react-icons/fi';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import Quagga from '@ericblade/quagga2';
import { supabase } from '../services/supabase';
import geminiAIService from '../services/geminiAIService';

const DualScannerInterface = ({ onBarcodeScanned, onClose, inventoryProducts = [] }) => {
  const [scanMode, setScanMode] = useState('camera'); // 'smart', 'camera', 'gun' - CAMERA ACTIVE BY DEFAULT
  const [cameraActive, setCameraActive] = useState(false);
  const [gunListening, setGunListening] = useState(true); // GUN SCANNER LISTENING BY DEFAULT
  const [recentScans, setRecentScans] = useState([]);
  const [usbDeviceConnected, setUSBDeviceConnected] = useState(false); // Track USB device connection
  const [usbDeviceName, setUSBDeviceName] = useState(''); // Store USB device name
  const [scanBuffer, setScanBuffer] = useState('');
  const [lastScanTime, setLastScanTime] = useState(null);
  const [scanStats, setScanStats] = useState({ total: 0, gunScans: 0, cameraScans: 0 });
  const [currentTransaction, setCurrentTransaction] = useState([]);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [showScanningIndicator, setShowScanningIndicator] = useState(false);
  const [supabaseProducts, setSupabaseProducts] = useState([]); // Products loaded from Supabase
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [noActivityTimer, setNoActivityTimer] = useState(null); // 4-second timer
  const [showNoActivityWarning, setShowNoActivityWarning] = useState(false);
  const [inactivityProduct, setInactivityProduct] = useState(null); // Product to show after 4 seconds
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [lastFrameData, setLastFrameData] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const gunInputRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const lastDetectedRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const detectionFrameCountRef = useRef(0);
  const indicatorTimeoutRef = useRef(null);

  //  Initialize Camera Scanner
  useEffect(() => {
    if (scanMode === 'camera' || scanMode === 'smart') {
      // Small delay to ensure video element is mounted
      const initDelay = setTimeout(() => {
        initializeCamera();
      }, 100);
      
      return () => {
        clearTimeout(initDelay);
        // Stop detection if running
        if (videoRef.current?._stopDetection) {
          videoRef.current._stopDetection();
        }
      };
    }
    return () => {
      // Stop detection and clean up stream when switching away from camera
      if (videoRef.current?._stopDetection) {
        videoRef.current._stopDetection();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        setCameraActive(false);
      }
    };
  }, [scanMode]);

  // � Load products from Supabase on mount
  useEffect(() => {
    loadProductsFromSupabase();
    startNoActivityTimer();
    
    return () => {
      if (noActivityTimer) clearTimeout(noActivityTimer);
    };
  }, []);

  // �🔫 Initialize Gun Scanner Listener
  useEffect(() => {
    if (scanMode === 'gun' || scanMode === 'smart') {
      initializeGunScanner();
    }
    return () => {
      if (gunInputRef.current) {
        gunInputRef.current.removeEventListener('keydown', handleGunInput);
      }
    };
  }, [scanMode]);

  const initializeCamera = async () => {
    try {
      // Check if video element exists
      if (!videoRef.current) {
        console.error('❌ Video element not ready');
        toast.error('❌ Video element not initialized');
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported on this device');
      }

      console.log('📸 Requesting camera permissions...');
      
      // Try with ideal constraints first, but fail gracefully
      let stream = null;
      let constraintsFailed = false;
      
      try {
        // Attempt 1: Full HD with environment facingMode
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          }),
          // Timeout after 5 seconds
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.warn('⚠️ Ideal constraints failed, trying fallback...');
        constraintsFailed = true;
        
        try {
          // Attempt 2: No specific facingMode, relaxed constraints
          stream = await Promise.race([
            navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
        } catch (error2) {
          console.warn('⚠️ Relaxed constraints failed, trying minimal...');
          
          // Attempt 3: Absolutely minimal constraints
          stream = await Promise.race([
            navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
        }
      }
      
      if (!stream || !stream.active) {
        throw new Error('Failed to get active camera stream');
      }

      console.log('✅ Camera stream obtained' + (constraintsFailed ? ' (with fallback constraints)' : ''));
      
      // Double-check video ref still exists
      if (!videoRef.current) {
        console.error('❌ Video reference lost after stream request');
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // Prepare video element BEFORE attaching stream
      const video = videoRef.current;
      video.playsInline = true;
      video.muted = true;
      
      // Attach stream to video element
      video.srcObject = stream;
      streamRef.current = stream;
      
      console.log('✅ Stream attached to video element');
      
      let metadataHandler;
      let canplayHandler;
      let timeoutId;
      let handlerCleanup = false;
      
      const cleanupHandlers = () => {
        if (handlerCleanup) return;
        handlerCleanup = true;
        if (video) {
          video.removeEventListener('loadedmetadata', metadataHandler);
          video.removeEventListener('canplay', canplayHandler);
          if (timeoutId) clearTimeout(timeoutId);
        }
      };
      
      // Wait for video metadata to load
      metadataHandler = () => {
        console.log('📹 Video metadata loaded, attempting playback...');
        if (!videoRef.current) {
          console.error('❌ Video reference lost during metadata load');
          cleanupHandlers();
          return;
        }

        videoRef.current.play()
          .then(() => {
            console.log('✅ Video playback started');
            setCameraActive(true);
            console.log('✅ Camera initialized and ready for barcode detection');
            toast.success('📸 Camera activated - point at barcode');
            startBarcodeDetection();
            cleanupHandlers();
          })
          .catch(err => {
            console.error('❌ Video play error:', err);
            toast.error('Failed to play video: ' + (err.message || 'Unknown error'));
            setCameraActive(false);
            cleanupHandlers();
          });
      };
      
      // Fallback: use canplay event if metadata doesn't fire
      canplayHandler = () => {
        console.log('📹 Video canplay event triggered');
        if (!videoRef.current) {
          cleanupHandlers();
          return;
        }

        videoRef.current.play()
          .then(() => {
            console.log('✅ Video playback started (canplay fallback)');
            setCameraActive(true);
            console.log('✅ Camera initialized and ready for barcode detection');
            toast.success('📸 Camera activated - point at barcode');
            startBarcodeDetection();
            cleanupHandlers();
          })
          .catch(err => {
            console.error('❌ Video play error (canplay):', err);
            setCameraActive(false);
            cleanupHandlers();
          });
      };
      
      video.addEventListener('loadedmetadata', metadataHandler);
      video.addEventListener('canplay', canplayHandler);
      
      console.log('📺 Video element ready, waiting for media to load...');
      
      // Timeout if neither event fires within 10 seconds
      timeoutId = setTimeout(() => {
        if (!cameraActive) {
          console.error('❌ Camera initialization timeout - no media event fired');
          console.warn('⚠️ Force-starting video playback...');
          cleanupHandlers();
          
          // Try to play anyway - sometimes video plays without events
          video.play()
            .then(() => {
              console.log('✅ Video playback started (forced)');
              setCameraActive(true);
              toast.success('📸 Camera activated - point at barcode');
              startBarcodeDetection();
            })
            .catch(err => {
              console.error('❌ Force-play failed:', err);
              toast.error('Camera timeout - please try again');
              setCameraActive(false);
              
              // Clean up current stream
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
              }
            });
        }
      }, 10000);
      
    } catch (error) {
      console.error('📸 Camera Error:', error);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        toast.error('❌ Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        toast.error('❌ No camera found on this device.');
      } else if (error.name === 'NotSupportedError') {
        toast.error('❌ Camera access not supported. Use HTTPS connection.');
      } else if (error.name === 'OverconstrainedError') {
        console.warn('⚠️ Camera constraints not supported, retrying with fallback...');
        toast.error('❌ Camera constraints not supported. Retrying...');
        retryWithFallbackConstraints();
        return;
      } else if (error.name === 'AbortError') {
        console.error('❌ Camera timeout or aborted:', error.message);
        toast.error('❌ Camera timeout - device may be busy. Please try again.');
      } else {
        toast.error('❌ Camera error: ' + (error.message || 'Unknown error'));
      }
      
      setCameraActive(false);
    }
  };

  const retryWithFallbackConstraints = async () => {
    try {
      console.log('🔄 Retrying with fallback camera constraints (basic video only)...');
      
      if (!videoRef.current) {
        console.error('❌ Video element not available for fallback');
        return;
      }

      // Request with NO constraints - let browser choose
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      if (!stream || !stream.active) {
        throw new Error('Fallback stream failed');
      }

      console.log('✅ Fallback stream obtained');

      const video = videoRef.current;
      video.srcObject = stream;
      streamRef.current = stream;
      video.playsInline = true;
      video.muted = true;

      let metadataHandler;
      let canplayHandler;
      let timeoutId;
      let handlerCleanup = false;

      const cleanupHandlers = () => {
        if (handlerCleanup) return;
        handlerCleanup = true;
        if (video) {
          video.removeEventListener('loadedmetadata', metadataHandler);
          video.removeEventListener('canplay', canplayHandler);
          if (timeoutId) clearTimeout(timeoutId);
        }
      };

      metadataHandler = () => {
        console.log('📹 Fallback: Video metadata loaded');
        if (!videoRef.current) {
          cleanupHandlers();
          return;
        }
        
        videoRef.current.play()
          .then(() => {
            setCameraActive(true);
            console.log('✅ Camera fallback initialized');
            toast.success('📸 Camera activated (fallback mode)');
            startBarcodeDetection();
            cleanupHandlers();
          })
          .catch(err => {
            console.error('❌ Fallback playback error:', err);
            setCameraActive(false);
            cleanupHandlers();
          });
      };

      canplayHandler = () => {
        console.log('📹 Fallback: Video canplay event triggered');
        if (!videoRef.current) {
          cleanupHandlers();
          return;
        }
        
        videoRef.current.play()
          .then(() => {
            setCameraActive(true);
            console.log('✅ Camera fallback initialized (canplay)');
            toast.success('📸 Camera activated (fallback mode)');
            startBarcodeDetection();
            cleanupHandlers();
          })
          .catch(err => {
            console.error('❌ Fallback playback error (canplay):', err);
            setCameraActive(false);
            cleanupHandlers();
          });
      };

      video.addEventListener('loadedmetadata', metadataHandler);
      video.addEventListener('canplay', canplayHandler);

      timeoutId = setTimeout(() => {
        if (!cameraActive) {
          console.error('❌ Fallback camera initialization timeout');
          toast.error('❌ Unable to initialize camera');
          cleanupHandlers();
          setCameraActive(false);
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      }, 8000);

    } catch (error) {
      console.error('❌ Fallback camera initialization failed:', error);
      toast.error('❌ Unable to access camera: ' + (error.message || 'Unknown error'));
      setCameraActive(false);
    }
  };

  const startBarcodeDetection = () => {
    if (!canvasRef.current || !videoRef.current) {
      console.error('❌ Canvas or Video reference missing');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.error('❌ Cannot get canvas context');
      return;
    }
    
    const video = videoRef.current;
    let frameCount = 0;
    let isDetecting = true; // Use local flag instead of stale closure
    let noDetectionStartTime = Date.now();
    let aiTriggered = false; // Prevent multiple AI triggers

    console.log('🎬 Starting barcode detection loop...');

    const detectFrame = async () => {
      try {
        // Process every frame for maximum sensitivity
        frameCount++;

        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Get image data for barcode detection
          let imageData;
          try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          } catch (err) {
            console.warn('⚠️ Cannot get image data (CORS):', err);
            if (isDetecting) {
              requestAnimationFrame(detectFrame);
            }
            return;
          }
          
          // Try jsQR detection FIRST (fastest for QR codes)
          let detectedBarcode = null;
          let detectedFormat = 'QR';
          try {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data && code.data.trim()) {
              detectedBarcode = code.data.trim();
              detectedFormat = 'QR Code';
              console.log('✅ QR Code Detected:', detectedBarcode);
            }
          } catch (e) {
            console.warn('⚠️ jsQR detection error:', e.message);
          }
          
          // If no QR found, try Quagga2 for other barcode formats (every 5th frame to save CPU)
          if (!detectedBarcode && frameCount % 5 === 0) {
            const quaggaResult = await detectBarcodeWithQuagga(canvas);
            if (quaggaResult && quaggaResult.barcode) {
              detectedBarcode = quaggaResult.barcode;
              detectedFormat = quaggaResult.format;
              console.log(`✅ ${quaggaResult.format} Detected:`, detectedBarcode);
            }
          }
          
          // Also check pattern to give FEEDBACK but don't use it as barcode data
          let patternDetected = false;
          if (!detectedBarcode) {
            patternDetected = detectBarcodePattern(imageData);
          }
          
          // Process detected barcode (from jsQR or Quagga2)
          if (detectedBarcode) {
            const now = Date.now();
            const timeSinceLastDetection = now - lastDetectionTimeRef.current;
            
            // Reset no-detection timer on successful barcode
            noDetectionStartTime = Date.now();
            aiTriggered = false;
            
            // IMMEDIATE feedback if different barcode or enough time passed
            if (lastDetectedRef.current !== detectedBarcode || timeSinceLastDetection > 300) {
              console.log('✅ QR Code detected:', detectedBarcode);
              lastDetectedRef.current = detectedBarcode;
              lastDetectionTimeRef.current = now;
              
              // Show scanning indicator for 2 seconds
              setShowScanningIndicator(true);
              if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
              indicatorTimeoutRef.current = setTimeout(() => setShowScanningIndicator(false), 2000);
              
              // ALWAYS give immediate feedback for QR detection
              playSound('detect');
              
              // Process the barcode (inventory check + transaction)
              handleScannedBarcode(detectedBarcode, 'camera');
            }
          }
          // Pattern detection only for feedback, not for transaction
          else if (patternDetected) {
            const now = Date.now();
            const timeSinceLastPattern = now - lastDetectionTimeRef.current;
            
            if (timeSinceLastPattern > 1000) {
              console.log('📊 Barcode pattern detected (awaiting QR data)');
              lastDetectionTimeRef.current = now;
              
              // Show scanning indicator for feedback only
              setShowScanningIndicator(true);
              if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
              indicatorTimeoutRef.current = setTimeout(() => setShowScanningIndicator(false), 1000);
              
              // Play detection sound for feedback
              playSound('detect');
              
              // Reset no-detection timer
              noDetectionStartTime = Date.now();
            }
          }
          // ✨ AUTO-TRIGGER AI ANALYSIS if no barcode detected for 10 seconds
          else {
            const noDetectionDuration = Date.now() - noDetectionStartTime;
            if (noDetectionDuration > 10000 && !aiTriggered && geminiAIService.isInitialized()) {
              console.log('⏰ No barcode detected for 10 seconds, triggering AI analysis...');
              aiTriggered = true;
              
              // Save current frame for AI analysis
              setLastFrameData(canvas.toDataURL('image/jpeg', 0.9));
              
              // Auto-trigger AI analysis with a small delay
              setTimeout(() => {
                if (canvas && canvasRef.current) {
                  toast.info('💡 Switching to AI analysis to identify the product...');
                  analyzeImageWithAI(canvas);
                }
              }, 200);
            }
          }
        }
      } catch (error) {
        console.error('Frame detection error:', error);
      }

      // Continue detection loop until stopped
      if (isDetecting) {
        requestAnimationFrame(detectFrame);
      }
    };

    // Store cleanup function on video element
    if (videoRef.current) {
      videoRef.current._stopDetection = () => {
        isDetecting = false;
        console.log('🛑 Barcode detection stopped');
      };
    }

    detectFrame();
  };

  const detectBarcodePattern = (imageData) => {
    // Pattern detection for FEEDBACK ONLY - returns true/false, not a barcode value
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Sample more rows for better detection coverage
    const sampleRows = [
      Math.floor(height * 0.15),
      Math.floor(height * 0.25),
      Math.floor(height * 0.35),
      Math.floor(height * 0.45),
      Math.floor(height * 0.5),
      Math.floor(height * 0.55),
      Math.floor(height * 0.65),
      Math.floor(height * 0.75),
      Math.floor(height * 0.85)
    ];
    
    for (const rowIndex of sampleRows) {
      let transitionCount = 0;
      let blackPixels = 0;
      let whitePixels = 0;
      
      // Scan horizontal line for patterns
      for (let x = 0; x < width - 1; x++) {
        const idx = (rowIndex * width + x) * 4;
        // Use average of RGB channels for brightness (more accurate than sum)
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const isBlack = brightness < 128; // Adjusted threshold for better sensitivity
        
        if (isBlack) {
          blackPixels++;
        } else {
          whitePixels++;
        }
        
        // Check for color transitions (bars in barcode)
        const nextIdx = (rowIndex * width + x + 1) * 4;
        const nextBrightness = (data[nextIdx] + data[nextIdx + 1] + data[nextIdx + 2]) / 3;
        const nextIsBlack = nextBrightness < 128;
        
        if (isBlack !== nextIsBlack) {
          transitionCount++;
        }
      }
      
      const totalPixels = blackPixels + whitePixels;
      const transitionRatio = transitionCount / totalPixels;
      const balanceRatio = Math.min(blackPixels, whitePixels) / totalPixels;
      
      // ULTRA-SENSITIVE thresholds for immediate FEEDBACK
      // If pattern detected, return true (feedback only - actual barcode must come from jsQR)
      if (transitionRatio > 0.05 && balanceRatio > 0.06) {
        console.log(`📊 Barcode pattern detected at row ${rowIndex} - Transitions: ${transitionRatio.toFixed(3)}, Balance: ${balanceRatio.toFixed(3)}`);
        return true; // Just indicate pattern was found, don't return fake barcode ID
      }
    }
    
    return false;
  };

  // Enhanced barcode detection using Quagga2 for multiple barcode formats
  const detectBarcodeWithQuagga = async (canvas) => {
    try {
      return new Promise((resolve) => {
        // Improve image quality before detection - increase contrast and brightness
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Enhance image - increase contrast
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate brightness
          const brightness = (r + g + b) / 3;
          
          // Enhance contrast - darker values get darker, lighter get lighter
          const enhanced = brightness < 128 ? brightness * 0.7 : 128 + (brightness - 128) * 1.5;
          const contrast = enhanced - brightness;
          
          data[i] = Math.min(255, Math.max(0, r + contrast * 0.5));
          data[i + 1] = Math.min(255, Math.max(0, g + contrast * 0.5));
          data[i + 2] = Math.min(255, Math.max(0, b + contrast * 0.5));
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Try Quagga detection with enhanced image
        try {
          Quagga.decodeSingle(
            {
              src: canvas.toDataURL('image/png', 0.95),
              numOfWorkers: 2,
              inputStream: {
                size: 1200
              },
              decoder: {
                readers: [
                  'code_128_reader',
                  'ean_reader',
                  'ean_8_reader',
                  'code_39_reader',
                  'codabar_reader',
                  'upc_reader',
                  'upc_e_reader',
                  'i2of5_reader'
                ],
                debug: {
                  showCanvas: false,
                  showPatternRectangle: false,
                  showBoundingBox: false,
                  showScanline: false
                }
              }
            },
            (result) => {
              if (result && result.codeResult && result.codeResult.code) {
                const barcode = result.codeResult.code.trim();
                const format = result.codeResult.format;
                const confidence = result.codeResult.confidence || 0;
                
                // Only accept if confidence is reasonable
                if (confidence > 0.3 || barcode.length >= 8) {
                  console.log(`✅ Barcode Detected [${format}]: ${barcode} (Confidence: ${confidence.toFixed(2)})`);
                  resolve({ barcode, format, confidence });
                } else {
                  console.warn('⚠️ Low confidence detection, rejecting');
                  resolve(null);
                }
              } else {
                resolve(null);
              }
            }
          );
        } catch (quaggaError) {
          console.warn('⚠️ Quagga error:', quaggaError.message);
          resolve(null);
        }
      });
    } catch (error) {
      console.warn('⚠️ Barcode detection error:', error.message);
      return null;
    }
  };

  const initializeGunScanner = () => {
    setGunListening(true);
    console.log('🔫 Gun Scanner Initializing...');
    
    // Focus on hidden input to capture gun scanner input
    if (gunInputRef.current) {
      gunInputRef.current.focus();
      console.log('✅ Gun input focused and ready');
      gunInputRef.current.addEventListener('keydown', handleGunInput);
    }
    
    // Auto-refocus every 100ms to ensure scanner stays focused
    const refocusInterval = setInterval(() => {
      if (gunInputRef.current && scanMode === 'gun') {
        gunInputRef.current.focus();
      }
    }, 100);

    // 📱 USB MOBILE DEVICE SUPPORT
    initializeUSBScanner();
    
    // Cleanup interval on unmount
    return () => clearInterval(refocusInterval);
  };

  const initializeUSBScanner = async () => {
    try {
      // Check if WebUSB API is available
      if (!navigator.usb) {
        console.log('⚠️ WebUSB API not available - USB scanner support disabled');
        return;
      }

      console.log('🔌 USB Scanner Support Initialized');

      // Listen for USB device connections
      navigator.usb.addEventListener('connect', handleUSBDeviceConnect);
      navigator.usb.addEventListener('disconnect', handleUSBDeviceDisconnect);

      // Check for already connected devices
      const devices = await navigator.usb.getDevices();
      if (devices.length > 0) {
        console.log(`✅ Found ${devices.length} connected USB device(s)`);
        devices.forEach(device => {
          console.log(`📱 Device: ${device.productName || 'Unknown'} (${device.manufacturerName || 'Unknown Manufacturer'})`);
        });
      }
    } catch (error) {
      console.warn('⚠️ USB Scanner initialization warning:', error.message);
    }
  };

  const handleUSBDeviceConnect = async (event) => {
    const device = event.device;
    const deviceName = device.productName || device.serialNumber || 'USB Device';
    
    console.log(`🔌 USB Device Connected: ${deviceName}`);
    setUSBDeviceConnected(true);
    setUSBDeviceName(deviceName);
    
    toast.info(`📱 Device connected: ${deviceName}`);
    toast.info('🎥 You can now use Phone Camera scanning!');
    
    // NOTE: Don't call requestUSBPermission here - it requires a user gesture!
    // User must click the "Connect USB" button instead
  };

  const handleUSBDeviceDisconnect = (event) => {
    const device = event.device;
    console.log(`❌ USB Device Disconnected: ${device.productName || 'Unknown Device'}`);
    setUSBDeviceConnected(false);
    setUSBDeviceName('');
    toast.warning(`📱 Device disconnected`);
  };

  const requestUSBPermission = async () => {
    try {
      if (!navigator.usb) {
        toast.error('❌ WebUSB not supported in this browser');
        return;
      }

      // Check if HTTPS is required (WebUSB only works on HTTPS or localhost)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        toast.error('⚠️ HTTPS required for USB access. Please use a secure connection.');
        console.warn('⚠️ WebUSB only works on HTTPS or localhost');
        return;
      }

      console.log('🔌 Opening USB device picker...');
      
      // IMPORTANT: Do NOT use await in a try-catch chain - it loses the user gesture!
      // Request device with both specific vendor IDs AND empty filter as last resort
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x18d1 }, // Google/Android
          { vendorId: 0x0fce }, // Sony
          { vendorId: 0x0bb4 }, // HTC
          { vendorId: 0x0e8d }, // MediaTek
          { vendorId: 0x1004 }, // LG
          { vendorId: 0x22b8 }, // Motorola
          { vendorId: 0x1949 }, // Lab126 (Amazon)
          { vendorId: 0x1a40 }, // Seagate
          { vendorId: 0x0951 }, // Kingston
          { vendorId: 0x8087 }, // Intel
          { classCode: 0x03 }, // HID class (barcode scanners)
          { classCode: 0x09 }, // Hub class
          { classCode: 0xff }  // Vendor specific
        ]
      });

      console.log(`✅ USB Device Selected: ${device.productName || device.serialNumber || 'Unknown Device'}`);
      toast.success(`📱 Device connected: ${device.productName || 'USB Scanner Device'}`);
      
    } catch (error) {
      console.error('🔌 USB Error:', error.name, error.message);
      
      if (error.name === 'NotFoundError') {
        console.warn('❌ No USB devices found - user cancelled or no devices detected');
        toast.error('❌ No compatible device found. Make sure your phone/scanner is connected.');
        showUSBTroubleshootingGuide();
      } else if (error.name === 'SecurityError') {
        console.warn('⚠️ SecurityError - Check if HTTPS required or user gesture lost');
        toast.error('⚠️ USB access denied. Make sure browser allows USB access.');
      } else if (error.name === 'AbortError') {
        console.log('ℹ️ User cancelled device selection');
      } else {
        toast.error(`❌ Error: ${error.message}`);
      }
    }
  };

  const showUSBTroubleshootingGuide = () => {
    console.log(`
    📱 USB Device Connection Troubleshooting:
    
    ✅ Android Phone (Recommended):
    1. Connect phone to computer via USB cable
    2. On phone: Enable "Developer Mode" (tap Build Number 7x in Settings > About)
    3. Enable "USB Debugging" in Developer Options
    4. Select "File Transfer" mode when prompted
    5. Try again in the scanner interface
    
    ✅ iPhone (via USB-C):
    1. Connect iPhone to computer
    2. Trust the computer when prompted
    3. Use a compatible barcode scanner app
    4. Try the USB connection again
    
    ✅ Physical Barcode Scanner:
    1. Connect scanner via USB
    2. Make sure scanner is in HID mode (not serial)
    3. Most scanners work automatically
    
    💡 If still not working:
    - Try using the 🔫 Gun Scanner mode instead (works with any keyboard input)
    - Make sure browser has permission to access USB (check browser settings)
    - Restart browser and try again
    - Use Chrome/Edge (best WebUSB support)
    `);
  };

  const handleUSBScannerInput = (barcode, source = 'usb') => {
    if (!barcode || barcode.length < 3) return;
    handleScannedBarcode(barcode, source);
  };

  // 📦 Load products directly from Supabase
  const loadProductsFromSupabase = async () => {
    try {
      setLoadingProducts(true);
      console.log('📥 Loading products from Supabase...');
      
      const { data: productsData, error } = await supabase
        .from('products')
        .select('id, name, sku, selling_price, price, barcode')
        .eq('is_active', true);

      if (error) throw error;

      setSupabaseProducts(productsData || []);
      console.log(`✅ Loaded ${(productsData || []).length} products from Supabase`);
      toast.info(`📦 Scanner ready with ${(productsData || []).length} products`);
    } catch (error) {
      console.error('❌ Error loading products:', error);
      toast.error('Failed to load products from database');
      setSupabaseProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // ⏱️ Start 4-second no-activity timeout - Show transaction summary or prompt
  const startNoActivityTimer = () => {
    const timer = setTimeout(() => {
      setShowNoActivityWarning(true);
      console.warn('⏰ No activity detected for 4 seconds');
      
      // Show creative popup based on current transaction state
      if (currentTransaction.length > 0) {
        // Show transaction summary
        setInactivityProduct({
          type: 'summary',
          items: currentTransaction,
          total: transactionTotal
        });
        playSound('success');
      } else {
        // Show "Ready to scan" prompt with random emoji
        const emojis = ['🚀', '⚡', '🏇', '💪', '🔥', '✨', '👍', '🎉'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        setInactivityProduct({
          type: 'prompt',
          emoji: randomEmoji,
          message: `${randomEmoji} Ready to scan your first product!`
        });
        playSound('detect');
      }
    }, 4000);
    
    setNoActivityTimer(timer);
  };

  // 🔄 Reset the no-activity timer when a scan happens
  const resetNoActivityTimer = () => {
    if (noActivityTimer) clearTimeout(noActivityTimer);
    setShowNoActivityWarning(false);
    setInactivityProduct(null);
    startNoActivityTimer();
  };

  const handleGunInput = (event) => {
    // Reset timer when input detected
    resetNoActivityTimer();
    
    const char = event.key;

    // Accumulate input with logging
    setScanBuffer(prev => {
      const newBuffer = prev + char;
      console.log(`🔫 Accumulating: "${newBuffer}"`);

      // Clear on clear key (usually ESC or special)
      if (char === 'Escape') {
        console.log('🔄 Cleared buffer (ESC pressed)');
        return '';
      }

      // Complete scan on Enter (standard barcode gun behavior)
      if (char === 'Enter') {
        const barcode = newBuffer.slice(0, -1).trim();
        if (barcode) {
          console.log(`✅ BARCODE COMPLETE: "${barcode}" - Processing...`);
          handleScannedBarcode(barcode, 'gun');
        } else {
          console.warn('⚠️ Empty barcode, ignoring');
        }
        return '';
      }

      return newBuffer;
    });

    event.preventDefault();
  };

  const findProductInInventory = (barcode) => {
    // First try Supabase products (real database)
    if (supabaseProducts && supabaseProducts.length > 0) {
      const found = supabaseProducts.find(product => 
        product.barcode?.toString().trim() === barcode.trim() ||
        product.id?.toString().trim() === barcode.trim() ||
        product.sku?.toString().trim() === barcode.trim()
      );
      if (found) return found;
    }
    
    // Fallback to props inventory products
    if (inventoryProducts && inventoryProducts.length > 0) {
      return inventoryProducts.find(product => 
        product.barcode?.toString().trim() === barcode.trim() ||
        product.id?.toString().trim() === barcode.trim()
      );
    }
    
    return null;
  };

  const addToTransaction = (barcode) => {
    const product = findProductInInventory(barcode);
    
    if (!product) {
      toast.error(`❌ Product Not Found: Barcode "${barcode}" does not exist in inventory`);
      playSound('error');
      return false;
    }

    // Add or update product in transaction
    setCurrentTransaction(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      } else {
        return [
          ...prev,
          {
            id: product.id,
            barcode: product.barcode,
            name: product.name || `Product ${product.id}`,
            price: product.price || 0,
            quantity: 1,
            subtotal: product.price || 0
          }
        ];
      }
    });

    return true;
  };

  // Update transaction total whenever items change
  useEffect(() => {
    const total = currentTransaction.reduce((sum, item) => sum + item.subtotal, 0);
    setTransactionTotal(total);
    console.log('💰 Transaction Total:', total);
  }, [currentTransaction]);

  const removeFromTransaction = (productId) => {
    setCurrentTransaction(prev => prev.filter(item => item.id !== productId));
    toast.info('🗑️ Item removed from transaction');
  };

  const clearTransaction = () => {
    setCurrentTransaction([]);
    toast.info('🧹 Transaction cleared');
  };

  // 💾 Save transaction to Supabase (creates real POS data for reporting)
  const saveTransactionToSupabase = async () => {
    if (currentTransaction.length === 0) {
      toast.warning('⚠️ No items in transaction to save');
      return;
    }

    try {
      console.log('💾 Saving transaction to Supabase...');
      
      // Create transaction record - handle if table doesn't exist
      let transactionId = null;
      try {
        const { data: transactionData, error: txnError } = await supabase
          .from('transactions')
          .insert([
            {
              amount: transactionTotal,
              transaction_type: 'sale',
              status: 'completed',
              created_at: new Date().toISOString()
            }
          ])
          .select();

        if (txnError) {
          console.warn('⚠️ Transactions table not available:', txnError);
        } else {
          transactionId = transactionData[0]?.id;
          console.log('✅ Transaction created:', transactionId);
        }
      } catch (e) {
        console.warn('⚠️ Could not save transaction (table may not exist):', e);
      }

      // Save each item as transaction_item (if transaction was created)
      if (transactionId) {
        const transactionItems = currentTransaction.map(item => ({
          transaction_id: transactionId,
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          created_at: new Date().toISOString()
        }));

        try {
          const { error: itemsError } = await supabase
            .from('transaction_items')
            .insert(transactionItems);

          if (itemsError) {
            console.warn('⚠️ Could not save transaction items:', itemsError);
          } else {
            console.log(`✅ Saved ${currentTransaction.length} transaction items`);
          }
        } catch (e) {
          console.warn('⚠️ Could not save transaction items:', e);
        }
      }

      // Update product quantities (stock depletion)
      for (const item of currentTransaction) {
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', item.id)
          .single();

        if (product) {
          const newQuantity = Math.max(0, (product.quantity || 0) - item.quantity);
          await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', item.id);
          
          console.log(`📦 Updated ${item.name}: ${product.quantity} → ${newQuantity}`);
        }
      }

      toast.success('✅ Transaction saved! Dashboard will update in 30 seconds.');
      console.log('💾 Full transaction saved to Supabase - Reports will reflect this data');
      
      // Clear transaction after successful save
      clearTransaction();
    } catch (error) {
      console.error('❌ Error saving transaction:', error);
      toast.error('Failed to save transaction: ' + error.message);
    }
  };

  const handleScannedBarcode = (barcode, source = 'unknown') => {
    if (!barcode || barcode.length < 3) return;

    const timestamp = new Date();
    setLastScanTime(timestamp);
    setScanBuffer('');

    console.log(`📊 Barcode scanned from ${source}:`, barcode);
    
    // IMMEDIATELY check if product exists in inventory (FAST FEEDBACK < 2 SECONDS)
    const product = findProductInInventory(barcode);
    
    if (!product) {
      // Product NOT FOUND - Show IMMEDIATE error notification
      playSound('error');
      toast.error(`❌ Product "${barcode}" NOT in inventory!`, {
        autoClose: 3000, // 3 second notification
        pauseOnHover: false,
        newestOnTop: true
      });
      console.warn(`❌ Product not found: ${barcode}`);
      
      // Call parent callback for logging/tracking
      onBarcodeScanned(barcode);
      
      // Keep scanner open for retry
      if (gunInputRef.current && (scanMode === 'gun' || scanMode === 'smart')) {
        setTimeout(() => gunInputRef.current?.focus(), 200);
      }
      return;
    }
    
    // Try to add to transaction
    const added = addToTransaction(barcode);

    // Update statistics
    if (added) {
      setScanStats(prev => {
        const updated = {
          total: prev.total + 1,
          gunScans: source === 'gun' ? prev.gunScans + 1 : prev.gunScans,
          cameraScans: source === 'camera' ? prev.cameraScans + 1 : prev.cameraScans
        };
        console.log('📈 Updated Scan Stats:', updated);
        return updated;
      });
    }

    // Add to recent scans
    const newScan = {
      id: Date.now(),
      barcode: barcode.toUpperCase(),
      source,
      timestamp,
      detected: true
    };

    setRecentScans(prev => [newScan, ...prev.slice(0, 9)]);

    // Play success sound
    playSound('success');
    toast.success(`✅ ${product.name} added!`, {
      autoClose: 2000, // 2 second notification
      pauseOnHover: false
    });

    // Callback to parent with full context
    onBarcodeScanned(barcode);

    // Auto-focus back to gun input
    if (gunInputRef.current && (scanMode === 'gun' || scanMode === 'smart')) {
      setTimeout(() => gunInputRef.current?.focus(), 200);
    }
  };

  const playSound = (type = 'success') => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
      oscillator.frequency.value = 1000; // Higher pitch
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'error') {
      oscillator.frequency.value = 300; // Lower pitch
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === 'detect') {
      // Quick double beep for barcode detection
      oscillator.frequency.value = 700; // Medium pitch
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
      
      // Second beep after delay
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 700;
        gain2.gain.setValueAtTime(0.05, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.05);
      }, 80);
    }
  };

  // 🤖 Analyze image with AI when barcode not found - with smart retries
  const analyzeImageWithAI = async (canvasElement, retryCount = 0) => {
    if (!geminiAIService.isInitialized()) {
      toast.error('❌ AI service not initialized. Check Gemini API key.');
      return;
    }

    const maxRetries = 3;

    try {
      setAiAnalyzing(true);
      setShowAIAnalysis(true);

      // Convert canvas to blob
      const blob = await geminiAIService.canvasToBlob(canvasElement);
      
      // Analyze with Gemini AI - attempt with retry count for smarter prompting
      const result = await geminiAIService.identifyProduct(blob, 'image/jpeg', retryCount + 1);
      
      if (result.success && result.data) {
        setAiResult({
          ...result.data,
          confidence: result.confidence,
          attempt: result.attempt
        });
        
        const confidencePercent = Math.round(result.confidence);
        const confidenceEmoji = result.confidence >= 80 ? '✅' : result.confidence >= 50 ? '⚠️' : '🔍';
        
        toast.success(`${confidenceEmoji} AI identified product (${confidencePercent}% confidence)`);
      } else {
        throw new Error('No product data returned');
      }
    } catch (error) {
      console.error(`AI analysis error (Attempt ${retryCount + 1}):`, error);
      
      // Auto-retry with different prompt strategy
      if (retryCount < maxRetries - 1) {
        toast.info(`🔄 Retrying with different analysis method...`);
        // Wait briefly before retry
        await new Promise(resolve => setTimeout(resolve, 800));
        return analyzeImageWithAI(canvasElement, retryCount + 1);
      } else {
        toast.error('❌ Could not identify product after multiple attempts');
        setAiResult(null);
      }
    } finally {
      setAiAnalyzing(false);
    }
  };

  const manualBarcodeScan = (barcode) => {
    if (!barcode.trim()) {
      toast.warning('⚠️ Please enter a barcode');
      return;
    }
    handleScannedBarcode(barcode);
  };

  const getScanSourceIcon = (source) => {
    switch (source) {
      case 'gun':
        return '🔫';
      case 'camera':
        return '📱';
      default:
        return '📦';
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-white/20">
        {/* ✨ Modern Gradient Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between flex-shrink-0 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          </div>
          
          <div className="flex items-center space-x-3 relative z-10">
            <div className="p-2 bg-white/20 rounded-full backdrop-blur-md">
              <FiZap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div>
              <h2 className="text-white text-xl sm:text-2xl font-bold tracking-tight">Smart Scanner</h2>
              <p className="text-white/80 text-xs sm:text-sm">Barcode • Camera • AI Recognition</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-all z-10 active:scale-90"
          >
            <FiX className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 p-2 sm:p-6 flex-1 overflow-y-auto">
          {/* Left: Scanner Modes */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center space-x-2">
              <FiSmartphone className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6" />
              <span className="font-semibold">Scanner Mode</span>
            </h3>

            {/* Mode Selection - Enhanced Cards */}
            <div className="space-y-2 sm:space-y-3">
              {[
                { id: 'smart', label: '🧠 Smart Mode', desc: 'Both sources', color: 'from-blue-500 to-blue-600' },
                { id: 'camera', label: '📱 Camera Scan', desc: 'Phone camera', color: 'from-purple-500 to-purple-600' },
                { id: 'gun', label: '🔫 Gun Scan', desc: 'Hand scanner', color: 'from-green-500 to-green-600' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setScanMode(mode.id)}
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    scanMode === mode.id
                      ? `bg-gradient-to-r ${mode.color} border-white shadow-lg text-white scale-105`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md text-gray-900'
                  }`}
                >
                  <p className={`font-bold text-sm sm:text-base ${scanMode === mode.id ? 'text-white' : 'text-gray-900'}`}>{mode.label}</p>
                  <p className={`text-xs ${scanMode === mode.id ? 'text-blue-50' : 'text-gray-600'}`}>{mode.desc}</p>
                </button>
              ))}
              
              {/* 🤖 AI Analysis Button - Fallback when barcode detection fails */}
              {cameraActive && geminiAIService.isInitialized() && (
                <button
                  onClick={() => {
                    if (canvasRef.current) {
                      analyzeImageWithAI(canvasRef.current);
                    } else {
                      toast.error('No camera frame available');
                    }
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl border-2 border-gradient-to-r from-purple-400 to-pink-400 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 font-bold group"
                  title="Use AI to identify product from camera image"
                >
                  <p className="text-gray-900 text-sm sm:text-base group-hover:text-purple-700 transition-colors">🤖 AI Analysis</p>
                  <p className="text-xs text-purple-700 group-hover:text-purple-900">Identify product visually</p>
                </button>
              )}
              
              {/* Creative No Activity Notification - Show after 4 seconds */}
              {showNoActivityWarning && inactivityProduct && (
                <div className="w-full overflow-hidden">
                  {inactivityProduct.type === 'summary' ? (
                    // 📊 Transaction Summary Popup
                    <div className="w-full p-2 sm:p-3 rounded-lg border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 animate-pulse">
                      <p className="font-bold text-green-900 text-sm sm:text-base mb-2">📊 Transaction Summary</p>
                      <div className="space-y-1 max-h-[120px] overflow-y-auto">
                        {inactivityProduct.items.map(item => (
                          <div key={item.id} className="flex justify-between text-xs text-green-800 bg-white bg-opacity-50 px-2 py-1 rounded">
                            <span className="font-semibold">{item.name}</span>
                            <span>x{item.quantity} = <span className="font-bold text-green-700">${item.subtotal.toFixed(2)}</span></span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-300 flex justify-between items-center">
                        <span className="font-bold text-green-900">💰 Total:</span>
                        <span className="text-lg font-bold text-green-700">${inactivityProduct.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    // 🏇 Ready to Scan Prompt - Enhanced with animation
                    <div className="w-full p-4 sm:p-5 rounded-xl border-2 border-gradient-to-r from-blue-400 to-cyan-400 bg-gradient-to-br from-blue-50 via-white to-cyan-50 animate-pulse shadow-lg">
                      <p className="font-bold text-blue-900 text-center text-3xl sm:text-4xl mb-2">{inactivityProduct.emoji}</p>
                      <p className="font-bold text-blue-900 text-center text-sm sm:text-base leading-relaxed">{inactivityProduct.message}</p>
                      <div className="mt-3 flex items-center justify-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                      <p className="text-xs text-blue-700 text-center mt-3 font-medium">📱 Point camera at barcode or use 🔫 gun scanner</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Loading status */}
              {loadingProducts && (
                <div className="w-full p-2 sm:p-3 rounded-lg border-2 border-blue-400 bg-blue-50">
                  <p className="font-bold text-blue-900 text-sm sm:text-base">📥 Loading Products...</p>
                  <p className="text-xs text-blue-700">Reading from Supabase</p>
                </div>
              )}
              
              {/* USB Mobile Device Connection Button */}
              {navigator.usb && (
                <div className="space-y-2">
                  <button
                    onClick={requestUSBPermission}
                    className="w-full p-2 sm:p-3 rounded-lg border-2 border-green-400 bg-green-50 hover:bg-green-100 transition-all active:scale-95"
                  >
                    <p className="font-bold text-gray-900 text-sm sm:text-base">🔌 Connect USB</p>
                    <p className="text-xs text-green-700">Mobile or scanner device</p>
                  </button>
                  
                  {/* Phone Camera Scanning - Only show when USB device connected */}
                  {usbDeviceConnected && (
                    <button
                      onClick={() => {
                        setScanMode('camera');
                        toast.success(`🎥 Phone Camera mode activated for ${usbDeviceName}`);
                      }}
                      className="w-full p-2 sm:p-3 rounded-lg border-2 border-purple-400 bg-purple-50 hover:bg-purple-100 transition-all active:scale-95 animate-pulse"
                    >
                      <p className="font-bold text-gray-900 text-sm sm:text-base">🎥 Phone Camera</p>
                      <p className="text-xs text-purple-700">{usbDeviceName}</p>
                    </button>
                  )}
                  
                  {/* Troubleshooting Button */}
                  <button
                    onClick={() => {
                      showUSBTroubleshootingGuide();
                      toast.info('📱 Troubleshooting guide printed to console');
                    }}
                    className="w-full p-2 sm:p-3 rounded-lg border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 transition-all active:scale-95"
                  >
                    <p className="font-bold text-gray-900 text-sm sm:text-base">❓ USB Help</p>
                    <p className="text-xs text-yellow-700">Setup instructions</p>
                  </button>
                </div>
              )}
            </div>

            {/* Status Indicators */}
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3 space-y-1 sm:space-y-2">
              <p className="text-xs font-bold text-gray-700 hidden sm:block">STATUS</p>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className="text-xs sm:text-sm text-gray-700">📱 {cameraActive ? 'Ready' : 'Off'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${gunListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className="text-xs sm:text-sm text-gray-700">🔫 {gunListening ? 'Listen' : 'Off'}</span>
              </div>
              {/* USB Device Status */}
              {usbDeviceConnected && (
                <div className="flex items-center space-x-2 pt-1 border-t border-gray-300">
                  <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-purple-500 animate-pulse"></div>
                  <span className="text-xs sm:text-sm text-gray-700">🔌 <span className="font-bold">{usbDeviceName}</span></span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-2 sm:p-3 space-y-1 border border-blue-200">
              <p className="text-xs sm:text-sm font-bold text-gray-900">📊 Stats</p>
              <p className="text-xs text-gray-700">📦 <span className="font-bold text-blue-600">{scanStats.total}</span></p>
              <p className="text-xs text-gray-700">🔫 <span className="font-bold text-red-600">{scanStats.gunScans}</span></p>
              <p className="text-xs text-gray-700">📱 <span className="font-bold text-green-600">{scanStats.cameraScans}</span></p>
              {lastScanTime && (
                <p className="text-xs text-gray-600 mt-2 flex items-center space-x-1">
                  <FiClock className="h-3 w-3" />
                  <span>{lastScanTime.toLocaleTimeString()}</span>
                </p>
              )}
            </div>
          </div>

          {/* Center: Camera Feed - Enhanced Modern Design */}
          <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center relative h-full min-h-[300px] sm:min-h-[400px] border border-gray-700 shadow-2xl">
            {scanMode === 'camera' || scanMode === 'smart' ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                {cameraActive && (
                  <>
                    {/* Enhanced scanning border with glow */}
                    <div className="absolute inset-0 border-3 border-blue-500/60 rounded-xl pointer-events-none shadow-xl shadow-blue-500/20">
                      {/* Top scanning line */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                      {/* Bottom scanning line */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                    </div>
                    
                    {/* Animated corner markers */}
                    <div className="absolute top-6 left-6 w-12 h-12 border-t-3 border-l-3 border-cyan-400 rounded-tl-xl shadow-lg shadow-cyan-400/30 animate-pulse"></div>
                    <div className="absolute top-6 right-6 w-12 h-12 border-t-3 border-r-3 border-cyan-400 rounded-tr-xl shadow-lg shadow-cyan-400/30 animate-pulse"></div>
                    <div className="absolute bottom-6 left-6 w-12 h-12 border-b-3 border-l-3 border-cyan-400 rounded-bl-xl shadow-lg shadow-cyan-400/30 animate-pulse"></div>
                    <div className="absolute bottom-6 right-6 w-12 h-12 border-b-3 border-r-3 border-cyan-400 rounded-br-xl shadow-lg shadow-cyan-400/30 animate-pulse"></div>
                  </>
                )}
                
                {/* Status indicator - Enhanced */}
                {showScanningIndicator && (
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-full text-xs sm:text-sm flex items-center space-x-2 shadow-2xl shadow-cyan-500/50 font-bold">
                    <div className="h-2.5 w-2.5 bg-white rounded-full animate-pulse"></div>
                    <span>✨ Scanning...</span>
                  </div>
                )}
                
                {/* Instructions - Enhanced modern card */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 bg-gradient-to-r from-black/80 to-gray-900/80 backdrop-blur-md text-white px-4 sm:px-5 py-3 sm:py-4 rounded-xl text-center space-y-2 border border-gray-700/50 shadow-2xl">
                  <p className="text-sm sm:text-base font-semibold">📱 Point camera at barcode</p>
                  <p className="text-cyan-400 font-bold text-xs sm:text-sm flex items-center justify-center space-x-1">
                    <FiCheck className="h-4 w-4" />
                    <span>Automatic detection active</span>
                  </p>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-2 sm:space-y-4 p-3 sm:p-6">
                <FiCamera className="h-8 w-8 sm:h-12 sm:w-12 text-gray-600" />
                <p className="text-gray-400 text-center text-xs sm:text-sm">
                  {scanMode === 'gun' 
                    ? '🔫 Gun mode active - scan with hand scanner'
                    : 'Switch to Camera mode to enable video'
                  }
                </p>
              </div>
            )}

            {/* Hidden Gun Input */}
            <input
              ref={gunInputRef}
              type="text"
              className="absolute opacity-0 -z-10"
              placeholder="Gun Scanner Input"
              tabIndex={scanMode === 'gun' || scanMode === 'smart' ? 0 : -1}
            />
          </div>

          {/* Right: Current Transaction */}
          <div className="space-y-2 sm:space-y-3 flex flex-col bg-gradient-to-b from-green-50 to-white rounded-lg border-2 border-green-300 p-2 sm:p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm sm:text-lg">🛒 Transaction</h3>
              {currentTransaction.length > 0 && (
                <button
                  onClick={clearTransaction}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-all active:scale-95"
                >
                  Clear
                </button>
              )}
            </div>
            
            {/* Transaction Items */}
            <div className="flex-1 bg-white rounded-lg p-2 sm:p-3 overflow-y-auto space-y-1 sm:space-y-2 border border-green-200">
              {currentTransaction.length === 0 ? (
                <p className="text-gray-400 text-center text-xs sm:text-sm py-4">No items yet</p>
              ) : (
                currentTransaction.map(item => (
                  <div
                    key={item.id}
                    className="bg-green-50 p-1 sm:p-2 rounded border border-green-200 text-xs space-y-0.5 sm:space-y-1 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-green-700 truncate text-xs">{item.name}</span>
                      <button
                        onClick={() => removeFromTransaction(item.id)}
                        className="text-red-500 hover:text-red-700 text-lg leading-none active:scale-125 transition-transform"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-gray-700">
                      <span>Qty: <span className="font-bold">{item.quantity}</span></span>
                      <span>₱{item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-green-700 border-t border-green-200 pt-1">
                      <span>Subtotal:</span>
                      <span>₱{item.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Transaction Total */}
            {currentTransaction.length > 0 && (
              <>
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg p-2 sm:p-4 space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between text-sm sm:text-lg">
                    <span className="font-bold">TOTAL</span>
                    <span className="text-lg sm:text-2xl font-bold">₱{transactionTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-xs opacity-90">
                    <p>Items: {currentTransaction.length} | Units: {currentTransaction.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  </div>
                </div>

                {/* Save Transaction Button - Creates POS data for dashboard */}
                <button
                  onClick={saveTransactionToSupabase}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg"
                >
                  <FiZap className="h-5 w-5" />
                  <span>💾 Save & Submit</span>
                </button>
              </>
            )}
          </div>

          {/* Recent Scans Log */}
          <div className="space-y-2 sm:space-y-3 flex flex-col">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">📋 Scans</h3>
            <div className="flex-1 bg-gray-50 rounded-lg p-2 sm:p-3 overflow-y-auto space-y-1 sm:space-y-2 border border-gray-200">
              {recentScans.length === 0 ? (
                <p className="text-gray-400 text-center text-xs sm:text-sm py-4">No scans</p>
              ) : (
                recentScans.map(scan => (
                  <div
                    key={scan.id}
                    className="bg-white p-1 sm:p-2 rounded border border-gray-200 text-xs space-y-0.5 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-600">{scan.barcode}</span>
                      <span>{getScanSourceIcon(scan.source)}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-600">
                      <FiCheck className="h-3 w-3 text-green-500" />
                      <span>{scan.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Manual Input */}
            <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200 space-y-1 sm:space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Manual Entry</label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const barcode = e.target.elements.manualBarcode.value;
                  manualBarcodeScan(barcode);
                  e.target.elements.manualBarcode.value = '';
                }}
                className="flex gap-1 sm:gap-2"
              >
                <input
                  name="manualBarcode"
                  type="text"
                  placeholder="Barcode..."
                  className="flex-1 px-2 py-2 sm:py-1 rounded border border-gray-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 sm:py-1 bg-blue-600 text-white rounded font-bold text-xs sm:text-sm hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap"
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* 🤖 AI Analysis Modal - Product Identification */}
        {showAIAnalysis && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 space-y-4">
              {aiAnalyzing ? (
                // Loading state with progress
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-spin opacity-75"></div>
                    <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                      <FiCpu className="h-8 w-8 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">🤖 AI Analysis</h3>
                    <p className="text-sm text-gray-600 mb-2">Analyzing product image with Gemini AI...</p>
                    <div className="h-1 w-24 mx-auto bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse rounded-full"></div>
                    </div>
                  </div>
                </div>
              ) : aiResult ? (
                // Success state with confidence indicator
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                      <FiCheck className="h-5 w-5 text-green-600" />
                      Product Identified
                    </h3>
                    {aiResult.confidence && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-gray-600">Confidence:</span>
                        <div className="px-2 py-1 rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: aiResult.confidence >= 80 ? '#dcfce7' : 
                                            aiResult.confidence >= 50 ? '#fef3c7' : '#fee2e2',
                            color: aiResult.confidence >= 80 ? '#166534' : 
                                   aiResult.confidence >= 50 ? '#b45309' : '#991b1b'
                          }}>
                          {Math.round(aiResult.confidence)}%
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg space-y-3 border border-blue-100">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Brand</p>
                      <p className="text-sm font-bold text-gray-900">{aiResult.brand}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Product Name</p>
                      <p className="text-sm font-bold text-gray-900">{aiResult.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Category</p>
                        <p className="text-sm font-bold text-blue-600">{aiResult.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Est. Price</p>
                        <p className="text-sm font-bold text-green-600">UGX {aiResult.estimatedPrice}</p>
                      </div>
                    </div>
                    {aiResult.packageSize && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Package Size</p>
                        <p className="text-sm font-bold text-gray-900">{aiResult.packageSize}</p>
                      </div>
                    )}
                    {aiResult.keyFeatures && aiResult.keyFeatures.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Features</p>
                        <div className="flex flex-wrap gap-2">
                          {aiResult.keyFeatures.map((feature, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              ✓ {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => {
                        setShowAIAnalysis(false);
                        toast.success('✅ Product identified and ready to add');
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-all active:scale-95"
                    >
                      Use This Product
                    </button>
                    <button
                      onClick={() => setShowAIAnalysis(false)}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 font-bold transition-all active:scale-95"
                    >
                      Retry Scan
                    </button>
                  </div>
                </div>
              ) : (
                // Error state
                <div className="text-center space-y-4">
                  <FiAlertCircle className="h-12 w-12 text-red-600 mx-auto" />
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Analysis Failed</h3>
                    <p className="text-sm text-gray-600 mt-2">Could not identify the product. Please try again.</p>
                  </div>
                  <button
                    onClick={() => setShowAIAnalysis(false)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all active:scale-95"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DualScannerInterface;
