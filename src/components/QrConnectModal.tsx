import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Smartphone, CheckCircle2, ShieldCheck, AlertCircle, Copy, Check } from 'lucide-react';
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
  const [qrData, setQrData] = useState<QrCodeData | null>(initialQr);
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string>('');
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [isConnected, setIsConnected] = useState(instance.status === 'connected');
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedPairing, setCopiedPairing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Generate QR Code image data URL if raw code string is provided without base64
  useEffect(() => {
    async function generateQrImage() {
      if (qrData?.base64) {
        // Base64 already supplied by Evolution API
        setGeneratedQrUrl(qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`);
      } else if (qrData?.code) {
        try {
          const url = await QRCode.toDataURL(qrData.code, {
            width: 280,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          setGeneratedQrUrl(url);
        } catch (e) {
          console.error('Failed to generate QR code canvas:', e);
        }
      } else {
        // Generate a fallback visual QR with instance name for preview
        try {
          const url = await QRCode.toDataURL(`whatsapp-connect:${instance.instance_name}`, {
            width: 280,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          setGeneratedQrUrl(url);
        } catch (e) {
          console.error(e);
        }
      }
    }
    generateQrImage();
  }, [qrData, instance.instance_name]);

  // 2. Poll for connection state every 3.5 seconds
  useEffect(() => {
    if (!isPolling || isConnected) return;

    const interval = setInterval(async () => {
      try {
        setPollCount((prev) => prev + 1);
        const res = await fetch(`/api/instances/${instance.id}/connect`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === 'connected' || data.state === 'open') {
          setIsConnected(true);
          setIsPolling(false);
          const updated = {
            ...instance,
            status: 'connected' as const,
            phone_number: data.phone || instance.phone_number || '+62 812-3456-7890',
            connected_at: new Date().toISOString(),
          };
          setTimeout(() => {
            onSuccess(updated);
          }, 1200);
        } else if (data.qr) {
          setQrData(data.qr);
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [instance, isPolling, isConnected, onSuccess]);

  // 3. Manual refresh
  const handleRefreshQr = async () => {
    setErrorMessage('');
    try {
      const res = await fetch(`/api/instances/${instance.id}/connect`);
      const data = await res.json();
      if (data.qr) {
        setQrData(data.qr);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to refresh QR');
    }
  };

  // 4. Simulate QR Scan (for testing in preview when not hooked to a live phone yet)
  const handleSimulateScan = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`/api/instances/${instance.id}/simulate-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: `+62 812-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsConnected(true);
        setIsPolling(false);
        setTimeout(() => {
          onSuccess(data.instance);
        }, 1000);
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Connect WhatsApp</h2>
              <p className="text-xs text-slate-500 font-mono">{instance.instance_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 text-center">
          {isConnected ? (
            <div className="py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">WhatsApp Connected!</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Instance session is open. Auto-replies and message sending are now active.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {/* QR Code Container */}
              <div className="relative mx-auto w-64 h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-3 shadow-inner group">
                {generatedQrUrl ? (
                  <img
                    src={generatedQrUrl}
                    alt="WhatsApp QR Code"
                    className="w-full h-full object-contain rounded-lg"
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
              <div className="mt-5 text-left bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  How to link WhatsApp:
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600">
                  <li>Open <strong>WhatsApp</strong> on your mobile device</li>
                  <li>Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong> and point your camera at this QR code</li>
                </ol>
              </div>

              {/* Pairing code if available */}
              {qrData?.pairingCode && (
                <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-800">
                  <span>Pairing code: <strong className="font-mono text-sm">{qrData.pairingCode}</strong></span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(qrData.pairingCode!);
                      setCopiedPairing(true);
                      setTimeout(() => setCopiedPairing(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-emerald-300 rounded font-semibold text-[11px]"
                  >
                    {copiedPairing ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedPairing ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isConnected && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              onClick={handleRefreshQr}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh QR</span>
            </button>

            {/* Quick Test / Simulate Scan button */}
            <button
              onClick={handleSimulateScan}
              disabled={isSimulating}
              className="text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200/80 px-3.5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              title="Test connection immediately without pairing a physical phone"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isSimulating ? 'Simulating...' : 'Simulate Scan (Test)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
