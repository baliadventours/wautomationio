import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  QrCode,
  ArrowRight,
  Hash,
  Phone,
} from 'lucide-react';
import QRCode from 'qrcode';
import { WhatsAppInstance, QrCodeData } from '../types';

interface QrConnectModalProps {
  instance: WhatsAppInstance;
  initialQr: QrCodeData | null;
  onClose: () => void;
  onSuccess: (updatedInstance: WhatsAppInstance) => void;
}

export const QrConnectModal: React.FC<QrConnectModalProps> = ({
  instance,
  initialQr,
  onClose,
  onSuccess,
}) => {
  // Tabs: 'phone' (pairing code) or 'qr' (QR code)
  const [activeTab, setActiveTab] = useState<'phone' | 'qr'>('phone');
  
  // Phone Number Pairing State
  const [phoneNumber, setPhoneNumber] = useState<string>(instance.phone_number || '');
  const [pairingCode, setPairingCode] = useState<string>(initialQr?.pairingCode || '');
  const [isRequestingPairing, setIsRequestingPairing] = useState(false);
  const [copiedPairing, setCopiedPairing] = useState(false);
  
  // QR Code State
  const [qrData, setQrData] = useState<QrCodeData | null>(initialQr);
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string>('');
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);

  // Polling & Status
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [isConnected, setIsConnected] = useState(instance.status === 'connected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Generate QR Code image data URL if raw code string is provided without base64
  useEffect(() => {
    async function generateQrImage() {
      if (qrData?.base64) {
        setGeneratedQrUrl(qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`);
      } else if (qrData?.code) {
        try {
          const url = await QRCode.toDataURL(qrData.code, {
            width: 320,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'L',
          });
          setGeneratedQrUrl(url);
        } catch (e) {
          console.error('Failed to generate QR code canvas:', e);
        }
      }
    }
    generateQrImage();
  }, [qrData]);

  // 2. Poll for connection state every 2.5 seconds using lightweight /status
  // NOTE: Never poll /connect, because calling /connect on Baileys resets the QR token!
  useEffect(() => {
    if (!isPolling || isConnected) return;

    const interval = setInterval(async () => {
      try {
        setPollCount((prev) => prev + 1);
        const res = await fetch(`/api/instances/${instance.id}/status`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === 'connected' || data.state === 'open') {
          setIsConnected(true);
          setIsPolling(false);
          const updated: WhatsAppInstance = {
            ...instance,
            status: 'connected',
            phone_number: data.phone || phoneNumber || instance.phone_number || '+62 812-4650-2939',
            connected_at: new Date().toISOString(),
          };
          setTimeout(() => {
            onSuccess(updated);
          }, 1200);
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [instance, isPolling, isConnected, onSuccess, phoneNumber]);

  // Initial load of QR if on QR tab and not already provided
  useEffect(() => {
    if (!qrData && activeTab === 'qr' && !isConnected) {
      handleRefreshQr();
    }
  }, [activeTab, qrData, isConnected]);

  // 3. Request Pairing Code by Phone Number
  const handleRequestPairingCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleaned = phoneNumber.replace(/\D/g, '');
    if (!cleaned || cleaned.length < 9) {
      setErrorMessage('Please enter a valid phone number with country code (e.g. +62 812 3456 7890)');
      return;
    }

    setIsRequestingPairing(true);
    try {
      const res = await fetch(`/api/instances/${instance.id}/pairing-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: cleaned }),
      });

      const data = await res.json();
      const isValidCode = (c: any) => Boolean(c && typeof c === 'string' && c.length <= 12 && !c.includes('/') && !c.includes('@') && !c.includes('='));
      
      if (data?.qr) {
        setQrData(data.qr);
      }

      if (res.ok && isValidCode(data.pairingCode)) {
        setPairingCode(data.pairingCode);
        setErrorMessage('');
      } else {
        // Try connect endpoint with number
        const fallbackRes = await fetch(`/api/instances/${instance.id}/connect?number=${cleaned}`);
        const fallbackData = await fallbackRes.json();
        const candidate = fallbackData?.qr?.pairingCode;
        if (fallbackData?.qr) {
          setQrData(fallbackData.qr);
        }
        if (isValidCode(candidate)) {
          setPairingCode(candidate);
          setErrorMessage('');
        } else {
          setErrorMessage('Evolution API generated a QR code for this line. You can link your phone immediately on the "Scan QR Code" tab.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request pairing code');
    } finally {
      setIsRequestingPairing(false);
    }
  };

  // 4. Manual QR Refresh
  const handleRefreshQr = async () => {
    setIsRefreshingQr(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/instances/${instance.id}/connect`);
      const data = await res.json();
      if (data.qr) {
        setQrData(data.qr);
      }
      if (data.error) {
        setErrorMessage(data.error);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to refresh QR');
    } finally {
      setIsRefreshingQr(false);
    }
  };

  // 5. Simulate QR Scan (optional testing fallback)
  const handleSimulateScan = async () => {
    setIsSimulating(true);
    try {
      const phoneToUse = phoneNumber || instance.phone_number || '+62 812-4650-2939';
      const res = await fetch(`/api/instances/${instance.id}/simulate-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneToUse }),
      });
      const data = await res.json();
      if (data.success) {
        setIsConnected(true);
        setIsPolling(false);
        setTimeout(() => {
          onSuccess(data.instance);
        }, 800);
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const copyPairingCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopiedPairing(true);
    setTimeout(() => setCopiedPairing(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-emerald-600/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Link WhatsApp Device</h2>
              <p className="text-xs text-slate-500 font-mono">
                {instance.profile_name || instance.instance_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Phone Number vs QR Code */}
        {!isConnected && (
          <div className="px-6 pt-4 pb-0 bg-slate-50/70 border-b border-slate-100 flex gap-2">
            <button
              onClick={() => {
                setActiveTab('phone');
                setErrorMessage('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
                activeTab === 'phone'
                  ? 'bg-white text-emerald-700 border-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Link with Phone Number (Pairing Code)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('qr');
                setErrorMessage('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
                activeTab === 'qr'
                  ? 'bg-white text-emerald-700 border-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR Code</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6">
          {isConnected ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">WhatsApp Connected!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Instance session is open. Auto-replies, keyword triggers, and message campaigns are now active.
                </p>
                <div className="mt-3 inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold rounded-lg">
                  {phoneNumber || instance.phone_number || '+62 812-4650-2939'}
                </div>
              </div>
            </div>
          ) : activeTab === 'phone' ? (
            /* =================== TAB 1: PHONE NUMBER PAIRING =================== */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter WhatsApp Phone Number (with country code)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+62 812-4650-2939"
                      className="w-full pl-9 pr-3 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRequestPairingCode()}
                    disabled={isRequestingPairing || !phoneNumber.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 shrink-0"
                  >
                    {isRequestingPairing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>{isRequestingPairing ? 'Generating...' : 'Get Code'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Example: <strong>6281246502939</strong> (Indonesia) or <strong>12125551234</strong> (US).
                </p>
              </div>

              {/* Pairing Code Display Card */}
              {pairingCode ? (
                <div className="bg-emerald-50/80 border-2 border-emerald-300/80 rounded-2xl p-5 text-center space-y-3">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Your 8-Character Pairing Code
                  </p>
                  
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl font-extrabold tracking-widest text-emerald-950 bg-white px-5 py-2 rounded-xl border border-emerald-200 shadow-sm select-all">
                      {pairingCode}
                    </span>
                    <button
                      onClick={copyPairingCode}
                      className="p-3 bg-white hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 transition-colors shadow-sm"
                      title="Copy Pairing Code"
                    >
                      {copiedPairing ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  <p className="text-xs text-emerald-700">
                    Enter this code in your WhatsApp app on your phone.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-slate-500 text-xs">
                  Enter your number above and click <strong>"Get Code"</strong> to generate your WhatsApp pairing code.
                </div>
              )}

              {/* Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  How to enter code in WhatsApp:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600">
                  <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                  <li>Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong></li>
                  <li>
                    Tap <strong>"Link with phone number instead"</strong> at the bottom of your screen
                  </li>
                  <li>Type in the 8-digit code shown above</li>
                </ol>
              </div>

              {/* Live Listening indicator */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-100/70 px-3 py-1.5 rounded-lg">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Listening for pairing confirmation...
                </span>
                <span className="font-mono text-slate-400">#{pollCount}</span>
              </div>
            </div>
          ) : (
            /* =================== TAB 2: QR CODE SCAN =================== */
            <div className="text-center space-y-4">
              {/* QR Code Container */}
              <div className="relative mx-auto w-72 h-72 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-4 shadow-md">
                {generatedQrUrl ? (
                  <img
                    src={generatedQrUrl}
                    alt="WhatsApp QR Code"
                    style={{ imageRendering: 'pixelated' }}
                    className="w-full h-full object-contain block bg-white"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Fetching QR from Evolution API...</span>
                  </div>
                )}

                {/* Scan Overlay status */}
                <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-md text-white text-[11px] py-1 px-2 rounded-md flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Listening for scan...
                  </span>
                  <span className="text-slate-400 text-[10px]">#{pollCount}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-600">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  How to link with QR Code:
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600">
                  <li>Open <strong>WhatsApp</strong> on your mobile device</li>
                  <li>Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong> and point camera at the QR code</li>
                </ol>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleRefreshQr}
                  disabled={isRefreshingQr}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                  <span>Refresh QR Code</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message banner */}
          {errorMessage && (
            <div className="mt-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <span>{errorMessage}</span>
                {qrData && activeTab === 'phone' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('qr');
                        setErrorMessage('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Switch to QR Code Tab</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isConnected && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Gateway: <code className="text-slate-600">localhost:8085</code>
            </span>

            {/* Quick Test / Bypass for preview testing */}
            <button
              onClick={handleSimulateScan}
              disabled={isSimulating}
              className="text-slate-400 hover:text-slate-600 underline text-[11px] transition-colors"
              title="Only click this to test without a physical WhatsApp phone"
            >
              {isSimulating ? 'Connecting...' : 'Or simulate connection test'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
