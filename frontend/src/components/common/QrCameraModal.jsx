import React, { useEffect, useState, useRef } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrCameraModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "ग्राहक QR कोड स्कैन करें",
  subtitle = "ग्राहक के मोबाइल पर खुला हुआ डिजिटल पास या कूपन QR कैमरे के सामने लाएं।"
}) {
  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const html5QrCodeRef = useRef(null);
  const readerElementId = "qr-live-camera-reader";

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      setScannedResult(null);
      setCameraError(null);
      setManualCode('');
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsScanning(true);

        // Small timeout to ensure DOM container is rendered
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(readerElementId);
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (!isMounted) return;
            // Successful scan
            playBeepSound();
            setScannedResult(decodedText);
            cleanupScanner();
            setTimeout(() => {
              onScanSuccess(decodedText);
              onClose();
            }, 600);
          },
          () => {
            // Frame read error, normal while scanning
          }
        );
      } catch (err) {
        if (!isMounted) return;
        console.warn("Camera start warning:", err);
        setCameraError("कैमरा एक्सेस नहीं मिला। कृपया कैमरा परमिशन दें या नीचे कोड मैन्युअली डालें।");
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      cleanupScanner();
    };
  }, [isOpen]);

  const cleanupScanner = () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
          }).catch(() => {
            html5QrCodeRef.current = null;
          });
        } else {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        }
      } catch (e) {
        html5QrCodeRef.current = null;
      }
    }
    setIsScanning(false);
  };

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch beep
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // AudioContext might be blocked, continue silently
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    cleanupScanner();
    onScanSuccess(manualCode.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121217] border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between bg-[#181820]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              cleanupScanner();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative p-6 flex flex-col items-center justify-center bg-black/95 min-h-[320px]">
          {scannedResult ? (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 animate-scaleUp">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <p className="text-lg font-bold text-white">सफलतापूर्वक स्कैन हो गया!</p>
              <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-sm px-4 py-2 rounded-xl">
                {scannedResult}
              </div>
              <p className="text-xs text-gray-400">वेरीफाई किया जा रहा है...</p>
            </div>
          ) : cameraError ? (
            <div className="flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-amber-300">{cameraError}</p>
              <p className="text-xs text-gray-400">आप नीचे दिए गए बॉक्स में कोड या मोबाइल नंबर सीधे टाइप कर सकते हैं।</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* html5-qrcode reader div */}
              <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-purple-500/50 bg-black shadow-inner">
                <div id={readerElementId} className="w-full h-full object-cover"></div>
                
                {/* Laser animation guide */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <span className="w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-lg"></span>
                    <span className="w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-lg"></span>
                  </div>
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_8px_#a855f7] animate-pulse"></div>
                  <div className="flex justify-between">
                    <span className="w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-lg"></span>
                    <span className="w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-lg"></span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-purple-300 bg-purple-950/40 px-3 py-1.5 rounded-full border border-purple-800/40">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>कैमरा सक्रिय है... QR को चौकोर फ्रेम में रखें</span>
              </div>
            </div>
          )}
        </div>

        {/* Manual Fallback Footer */}
        <div className="p-4 bg-[#181820] border-t border-gray-800">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>या नंबर / कोड मैन्युअली टाइप करें:</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Smartphone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="उदा. 9876543210 या DC-XXXX"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full bg-[#121217] border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-purple-600/20"
              >
                आगे बढ़ें
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
