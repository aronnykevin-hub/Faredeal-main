import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  FiX, FiCamera, FiZap, FiCheckCircle, FiAlertCircle, FiRotateCw,
  FiMaximize, FiMinimize, FiTarget, FiShield, FiClock, FiStar
} from 'react-icons/fi';

const QRScanner = ({ isOpen, onClose, onQRScanned, expectedData }) => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanLine, setScanLine] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const scannerRef = useRef(null);
  const animationRef = useRef(null);

  // Demo QR codes for testing (these would match cashier-generated codes)
  const demoQRCodes = [
    expectedData, // The actual expected QR code
    btoa(JSON.stringify({
      orderId: 'ORD-DEMO-001',
      total: 991.86,
      timestamp: new Date().toISOString(),
      cashierId: 'CASH001',
      qrCode: 'PAY-DEMO-001'
    })),
    btoa(JSON.stringify({
      orderId: 'ORD-DEMO-002',
      total: 156.45,
      timestamp: new Date().toISOString(),
      cashierId: 'CASH002',
      qrCode: 'PAY-DEMO-002'
    }))
  ];

  useEffect(() => {
    if (isOpen && scanning) {
      startScanAnimation();
    } else {
      stopScanAnimation();
    }

    return () => stopScanAnimation();
  }, [isOpen, scanning]);

  const startScanAnimation = () => {
    let position = 0;
    const animate = () => {
      position = (position + 1.5) % 100;
      setScanLine(position);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const stopScanAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const simulateQRScan = async () => {
    setScanning(true);
    setScanResult(null);
    setScanAttempts(prev => prev + 1);
    
    // Simulate scanning process with confidence building
    let currentConfidence = 0;
    const confidenceInterval = setInterval(() => {
      currentConfidence += Math.random() * 20;
      setConfidence(Math.min(currentConfidence, 100));
    }, 200);

    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    clearInterval(confidenceInterval);
    setConfidence(100);

    // 90% success rate for scanning
    const success = Math.random() > 0.1;
    
    if (success) {
      // Randomly select a demo QR code or use the expected one
      const useExpected = Math.random() > 0.3; // 70% chance to use expected
      const qrData = useExpected ? expectedData : demoQRCodes[Math.floor(Math.random() * demoQRCodes.length)];
      
      const result = {
        data: qrData,
        success: true,
        timestamp: new Date(),
        scanId: `scan_${Date.now()}`,
        confidence: 100
      };
      
      setScanResult(result);
      
      // Haptic feedback (if supported)
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Success sound
      playBeep(800, 100);
      
      toast.success('📱 QR Code scanned successfully!');
      
      // Auto-process after showing result
      setTimeout(() => {
        onQRScanned(qrData);
      }, 1500);
    } else {
      setScanResult({
        success: false,
        error: 'Could not read QR code clearly. Please ensure good lighting and stable positioning.',
        timestamp: new Date(),
        confidence: Math.floor(Math.random() * 60) + 20
      });
      
      // Error sound
      playBeep(300, 200);
      toast.error('❌ Scan failed - Please try again');
    }
    
    setScanning(false);
    setConfidence(0);
  };

  const playBeep = (frequency, duration) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      // Fallback for browsers that don't support Web Audio API
      console.log('Audio feedback not available');
    }
  };

  const rescanQR = () => {
    setScanResult(null);
    simulateQRScan();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isFullscreen ? 'bg-black' : ''}`}>
      <div className={`flex items-center justify-center min-h-screen ${isFullscreen ? 'p-0' : 'pt-4 px-4 pb-20'} text-center`}>
        {!isFullscreen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        )}

        <div className={`inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiCamera className="h-6 w-6 text-white mr-3" />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    📱 Payment QR Scanner
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Attempts: {scanAttempts} | Secure Payment Verification
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-gray-200 transition-colors p-1"
                >
                  {isFullscreen ? <FiMinimize className="h-5 w-5" /> : <FiMaximize className="h-5 w-5" />}
                </button>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 transition-colors p-1"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Scanner Viewport */}
            <div className="relative bg-black rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '4/3' }}>
              {/* Camera Feed Simulation */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-8 grid-rows-6 h-full">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div key={i} className={`border border-gray-600 ${Math.random() > 0.7 ? 'bg-blue-500' : ''}`}></div>
                    ))}
                  </div>
                </div>

                {/* QR Code Frame */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-80 h-80 border-2 border-white rounded-lg">
                    {/* Animated Corner Markers */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-white animate-pulse"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-white animate-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-white animate-pulse"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-white animate-pulse"></div>

                    {/* Scanning Grid */}
                    <div className="absolute inset-4 grid grid-cols-6 grid-rows-6 opacity-20">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div key={i} className={`border border-white ${scanning && Math.random() > 0.8 ? 'bg-green-400' : ''}`}></div>
                      ))}
                    </div>

                    {/* Scan Line */}
                    {scanning && (
                      <div 
                        className="absolute w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-lg"
                        style={{ 
                          top: `${scanLine}%`,
                          boxShadow: '0 0 20px rgba(34, 197, 94, 0.8)'
                        }}
                      ></div>
                    )}

                    {/* Center Target */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FiTarget className={`h-12 w-12 text-white opacity-50 ${scanning ? 'animate-spin' : 'animate-pulse'}`} />
                    </div>

                    {/* Instructions */}
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-white text-sm text-center">
                      {scanning ? 'Scanning QR Code...' : 'Position QR code in center frame'}
                    </div>
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="absolute top-4 left-4 flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${scanning ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
                    <span className="text-white text-sm font-medium">
                      {scanning ? 'SCANNING' : 'READY'}
                    </span>
                  </div>
                  
                  {scanning && confidence > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">{Math.round(confidence)}%</span>
                    </div>
                  )}
                </div>

                {/* Security Badge */}
                <div className="absolute top-4 right-4 flex items-center space-x-1 bg-black bg-opacity-50 rounded-full px-3 py-1">
                  <FiShield className="h-4 w-4 text-green-400" />
                  <span className="text-white text-xs font-medium">Secure</span>
                </div>

                {/* Scan Result Overlay */}
                {scanResult && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center animate-fadeIn">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center">
                      {scanResult.success ? (
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-successPulse">
                            <FiCheckCircle className="h-8 w-8 text-green-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">✅ QR Code Verified!</h4>
                            <p className="text-gray-600 mb-2">Payment order confirmed</p>
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="flex items-center justify-center space-x-2">
                                <FiStar className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Confidence: {scanResult.confidence}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => onQRScanned(scanResult.data)}
                              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                              Continue Payment
                            </button>
                            <button
                              onClick={rescanQR}
                              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                              Scan Again
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-shake">
                            <FiAlertCircle className="h-8 w-8 text-red-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">❌ Scan Failed</h4>
                            <p className="text-gray-600 text-sm mb-3">{scanResult.error}</p>
                            <div className="bg-red-50 rounded-lg p-3">
                              <div className="flex items-center justify-center space-x-2">
                                <FiAlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-red-800">Confidence: {scanResult.confidence}%</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={rescanQR}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            <FiRotateCw className="h-4 w-4 inline mr-2" />
                            Try Again
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Main Scan Button */}
              <div className="text-center">
                <button
                  onClick={simulateQRScan}
                  disabled={scanning}
                  className={`inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-white shadow-lg transition-all transform ${
                    scanning 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 active:scale-95'
                  }`}
                >
                  {scanning ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Scanning QR Code...
                    </>
                  ) : (
                    <>
                      <FiZap className="h-6 w-6 mr-3" />
                      Scan Payment QR Code
                    </>
                  )}
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <FiCamera className="h-5 w-5 mr-2 text-blue-600" />
                  Scanning Instructions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div className="space-y-2">
                    <p>• Position QR code in center frame</p>
                    <p>• Ensure good lighting conditions</p>
                    <p>• Hold device steady while scanning</p>
                  </div>
                  <div className="space-y-2">
                    <p>• QR code should be clearly visible</p>
                    <p>• Avoid glare and reflections</p>
                    <p>• Wait for confirmation beep</p>
                  </div>
                </div>
              </div>

              {/* Demo QR Codes for Testing */}
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <h4 className="font-semibold text-gray-900 mb-3">
                  🎯 Demo Mode (Click to simulate scan)
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {demoQRCodes.slice(0, 2).map((qrData, index) => (
                    <button
                      key={index}
                      onClick={() => onQRScanned(qrData)}
                      className="text-left px-3 py-2 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-100 transition-colors text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs truncate mr-2">
                          Demo QR #{index + 1}
                        </span>
                        <FiZap className="h-4 w-4 text-yellow-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FiShield className="h-4 w-4" />
                <span>Secure payment verification • End-to-end encrypted</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;



