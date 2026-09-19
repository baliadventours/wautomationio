import React from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const curlExample = `curl -X POST https://api.yourdomain.com/v1/messages/send \\
  -H "Authorization: Bearer wa_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel_id": "chan_prod_1",
    "to": "+628123456789",
    "type": "text",
    "text": "Hello from Wautomation.io Public Gateway!"
  }'`;

  const nodeExample = `const response = await fetch('https://api.yourdomain.com/v1/messages/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wa_live_YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    channel_id: 'chan_prod_1',
    to: '+628123456789',
    type: 'text',
    text: 'Hello from Node.js!'
  })
});
const data = await response.json();
console.log(data);`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Public REST API Reference (v1)</h2>
        <p className="text-sm text-slate-500">Integrate WhatsApp dispatch directly into your external services and webhooks.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-mono text-xs font-bold rounded-lg">POST</span>
          <code className="font-mono text-sm font-semibold text-slate-800">/v1/messages/send</code>
        </div>
        <p className="text-sm text-slate-600">Send an outbound message to a WhatsApp user through your active channel.</p>

        <div className="relative bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => copyCode(curlExample, 1)}
            className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
          >
            {copiedIndex === 1 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <pre>{curlExample}</pre>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-900 text-sm">Node.js Integration</h3>
        <div className="relative bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => copyCode(nodeExample, 2)}
            className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
          >
            {copiedIndex === 2 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <pre>{nodeExample}</pre>
        </div>
      </div>
    </div>
  );
};
