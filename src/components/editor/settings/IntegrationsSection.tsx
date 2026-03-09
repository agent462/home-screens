'use client';

import { useState, useEffect, useCallback } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import Button from '@/components/ui/Button';

type SecretKey =
  | 'openweathermap_key'
  | 'weatherapi_key'
  | 'unsplash_access_key'
  | 'todoist_token'
  | 'google_maps_key'
  | 'tomtom_key'
  | 'google_client_id'
  | 'google_client_secret';

type SecretStatus = Partial<Record<SecretKey, boolean>>;

function StatusDot({ configured }: { configured: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${
          configured ? 'bg-green-400' : 'bg-neutral-600'
        }`}
      />
      <span className={configured ? 'text-green-400' : 'text-neutral-500'}>
        {configured ? 'Configured' : 'Not configured'}
      </span>
    </span>
  );
}

function SecretField({
  label,
  secretKey,
  placeholder,
  helpText,
  status,
  onSaved,
}: {
  label: string;
  secretKey: SecretKey;
  placeholder: string;
  helpText: string;
  status: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSave() {
    if (!value.trim()) return;
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      const res = await editorFetch('/api/secrets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: secretKey, value: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus('error');
        setErrorMsg(data.error ?? 'Failed to save');
        return;
      }
      setSaveStatus('saved');
      setValue('');
      onSaved();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setErrorMsg('Network error');
    }
  }

  async function handleDelete() {
    try {
      const res = await editorFetch('/api/secrets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: secretKey }),
      });
      if (res.ok) onSaved();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">{label}</span>
        <div className="flex items-center gap-2">
          <StatusDot configured={status} />
          {status && (
            <button
              onClick={handleDelete}
              className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaveStatus('idle'); }}
          placeholder={placeholder}
          className="flex-1 rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSave}
          disabled={!value.trim() || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? '...' : 'Save'}
        </Button>
      </div>
      {saveStatus === 'saved' && (
        <span className="text-xs text-green-400">Saved successfully</span>
      )}
      {saveStatus === 'error' && (
        <span className="text-xs text-red-400">{errorMsg}</span>
      )}
      <p className="text-xs text-neutral-500">{helpText}</p>
    </div>
  );
}

export default function IntegrationsSection() {
  const [status, setStatus] = useState<SecretStatus>({});
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await editorFetch('/api/secrets');
      if (res.ok) {
        const data: SecretStatus = await res.json();
        setStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) {
    return (
      <section>
        <p className="text-xs text-neutral-500">Loading integration status...</p>
      </section>
    );
  }

  return (
    <section>
      {/* Google */}
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          Google
        </h3>
        <div className="space-y-4">
          <SecretField
            label="OAuth Client ID"
            secretKey="google_client_id"
            placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
            helpText="Required for Google Calendar. Create at console.cloud.google.com → APIs & Services → Credentials. Use type: TVs and Limited Input devices."
            status={!!status.google_client_id}
            onSaved={fetchStatus}
          />
          <SecretField
            label="OAuth Client Secret"
            secretKey="google_client_secret"
            placeholder="e.g. GOCSPX-..."
            helpText="The client secret from the same OAuth credential above."
            status={!!status.google_client_secret}
            onSaved={fetchStatus}
          />
          <SecretField
            label="Maps API Key"
            secretKey="google_maps_key"
            placeholder="Paste your Google Maps API key"
            helpText="Optional — for traffic/commute widget. Enable the Routes API in the same Cloud Console project."
            status={!!status.google_maps_key}
            onSaved={fetchStatus}
          />
        </div>
      </div>

      <hr className="my-6 border-neutral-700" />

      {/* Unsplash */}
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          Backgrounds (Unsplash)
        </h3>
        <div className="space-y-3">
          <SecretField
            label="Access Key"
            secretKey="unsplash_access_key"
            placeholder="Paste your Unsplash access key"
            helpText="Free at unsplash.com/developers — 50 requests/hour on free tier"
            status={!!status.unsplash_access_key}
            onSaved={fetchStatus}
          />
          <p className="text-xs text-neutral-500">
            Enables browsing thousands of free HD photos by category in the background picker.
          </p>
        </div>
      </div>

      <hr className="my-6 border-neutral-700" />

      {/* Todoist */}
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          Todoist
        </h3>
        <div className="space-y-3">
          <SecretField
            label="API Token"
            secretKey="todoist_token"
            placeholder="Paste your Todoist API token"
            helpText="Get your API token from app.todoist.com/app/settings/integrations/developer"
            status={!!status.todoist_token}
            onSaved={fetchStatus}
          />
        </div>
      </div>

      <hr className="my-6 border-neutral-700" />

      {/* Traffic / Commute */}
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
          Traffic / Commute
        </h3>
        <div className="space-y-4">
          <SecretField
            label="TomTom API Key"
            secretKey="tomtom_key"
            placeholder="Paste your TomTom API key"
            helpText="Alternative to Google Maps for traffic data. Free at developer.tomtom.com — Routing API required."
            status={!!status.tomtom_key}
            onSaved={fetchStatus}
          />
        </div>
      </div>
    </section>
  );
}
