import React, { useState, useEffect } from 'react';
import { FiCamera, FiZap, FiX, FiSmartphone, FiMonitor, FiWifi } from 'react-icons/fi';
import BarcodeScannerModal from './BarcodeScannerModal';

const FloatingScanner = () => {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [deviceCount, setDeviceCount] = useState(0);
  const [lastScan, setLastScan] = useState(null);

  // Detect available devices on mount
  useEffect(() => {
    const detectDevices = async () => {
      let count = 0;
      
      // Check camera
      if (navigator.mediaDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices.filter(device => device.kind === 'videoinput');
          count += cameras.length;
        } catch (error) {
          console.log('Camera detection failed');
        }
      }
      
      // Check USB HID
      if (navigator.hid) {
        try {
          const hidDevices = await navigator.hid.getDevices();
          count += hidDevices.length;
        } catch (error) {
          console.log('HID detection failed');
        }
      }
      
      // Check Bluetooth
      if (navigator.bluetooth) {
        try {
          // Bluetooth API doesn't have getDevices() method
          // Just check if the API is available and functional
          const isBluetoothAvailable = await navigator.bluetooth.getAvailability();
          if (isBluetoothAvailable) {
            count += 1; // Add one for potential Bluetooth scanners
          }
        } catch (error) {
          // Bluetooth may not be supported or permission denied
          console.log('Bluetooth detection failed:', error.message);
        }
      } else {
        console.log('Bluetooth API not supported in this browser');
      }
      
      // Always add demo device
      count += 1;
      
      setDeviceCount(count);
    };
    
    detectDevices();
    
    // Auto-hide timer
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 30000); // Hide after 30 seconds
    
    return () => clearTimeout(hideTimer);
  }, []);

  const handleBarcodeScanned = (barcode) => {
    setLastScan({
      barcode,
      timestamp: new Date(),
      device: 'Hardware Scanner'
    });
    setShowBarcodeScanner(false);
    
    // Show brief success indicator
    setIsExpanded(true);
    setTimeout(() => setIsExpanded(false), 3000);
  };

  // Don't show on landing pages
  const currentPath = window.location.pathname;
  const isLandingPage = currentPath === '/' || 
                       currentPath === '/customer-landing' || 
                       currentPath === '/portal-landing' ||
                       currentPath === '/main-landing';
  
  if (isLandingPage || !isVisible) return null;

  return (
    <>
      {/* Floating Scanner Widget */}
      <div className="fixed bottom-20 right-6 z-50">
        <div className={`transition-all duration-500 ${isExpanded ? 'scale-110' : 'scale-100'}`}>
          {/* Expanded State */}
          {isExpanded && (
            <div className="absolute bottom-20 right-0 bg-white rounded-xl shadow-2xl p-4 border-2 border-green-500 min-w-64 animate-slideInUp">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-800 flex items-center">
                  <FiCamera className="mr-2 text-green-600" />
                  Hardware Scanner
                </h4>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Available Devices:</span>
                  <span className="font-bold text-blue-600">{deviceCount}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <FiSmartphone className="text-green-600" />
                    <span>Mobile</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FiMonitor className="text-purple-600" />
                    <span>USB</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FiWifi className="text-blue-600" />
                    <span>Bluetooth</span>
                  </div>
                </div>
                
                {lastScan && (
                  <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                    <div className="text-xs text-green-700 font-medium">Last Scan:</div>
                    <div className="font-mono text-sm text-green-900">{lastScan.barcode}</div>
                    <div className="text-xs text-green-600">{lastScan.timestamp.toLocaleTimeString()}</div>
                  </div>
                )}
                
                <button
                  onClick={() => setShowBarcodeScanner(true)}
                  className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-bold hover:from-green-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <FiZap className="h-4 w-4" />
                  <span>Launch Scanner</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Main Floating Button */}
          <div
            className="relative group"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setTimeout(() => setIsExpanded(false), 2000)}
          >
            <button
              onClick={() => setShowBarcodeScanner(true)}
              className="w-16 h-16 bg-gradient-to-br from-green-500 via-blue-600 to-purple-600 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 animate-bounce group"
              title="Hardware Scanner - Mobile, USB, Bluetooth"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-orange-500/30 rounded-full animate-pulse"></div>
              <div className="relative flex items-center justify-center h-full">
                <FiCamera className="h-8 w-8 text-white" />
              </div>
              
              {/* Device count badge */}
              {deviceCount > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                  {deviceCount}
                </div>
              )}
              
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-50"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-30 animation-delay-150"></div>
            </button>
            
            {/* Floating tooltip */}
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-90 text-white text-sm px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              🔍 Hardware Scanner
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black border-opacity-90"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </>
  );
};

export default FloatingScanner;
