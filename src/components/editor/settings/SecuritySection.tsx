'use client';

import { useState, useEffect } from 'react';
import { editorFetch } from '@/lib/editor-fetch';
import Button from '@/components/ui/Button';

interface AuthStatus {
  authEnabled: boolean;
  authenticated: boolean;
}

export default function SecuritySection() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modal, setModal] = useState<'set' | 'change' | 'disable' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) setStatus(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  function resetModal() {
    setModal(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  }

  async function handleSetPassword() {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await editorFetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to set password');
        return;
      }
      setStatus({ authEnabled: true, authenticated: true });
      setSuccess('Password set! Authentication is now enabled.');
      setTimeout(resetModal, 2000);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await editorFetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }
      setSuccess('Password changed. All other sessions have been invalidated.');
      setTimeout(resetModal, 2000);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await editorFetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to disable authentication');
        return;
      }
      setStatus({ authEnabled: false, authenticated: false });
      setSuccess('Authentication disabled.');
      setTimeout(resetModal, 2000);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <section>
        <p className="text-xs text-neutral-500">Checking authentication status...</p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
        Authentication
      </h3>
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status?.authEnabled ? 'bg-green-400' : 'bg-neutral-600'
            }`}
          />
          <span className="text-sm text-neutral-300">
            {status?.authEnabled
              ? 'Authentication is enabled'
              : 'Authentication is disabled'}
          </span>
        </div>

        {!status?.authEnabled && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500">
              Set a password to protect the editor and all write operations.
              The display view will remain accessible without a password.
            </p>
            <Button variant="primary" size="sm" onClick={() => setModal('set')}>
              Set Password
            </Button>
          </div>
        )}

        {status?.authEnabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModal('change')}>
                Change Password
              </Button>
              <Button variant="danger" size="sm" onClick={() => setModal('disable')}>
                Disable Authentication
              </Button>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-neutral-600">
          Forgot your password? Delete <code className="text-neutral-500">data/auth.json</code> on the device to reset.
        </p>
      </div>

      {/* Modal overlay */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h4 className="text-sm font-medium text-neutral-200 mb-4">
              {modal === 'set' && 'Set Password'}
              {modal === 'change' && 'Change Password'}
              {modal === 'disable' && 'Disable Authentication'}
            </h4>

            <div className="space-y-3">
              {(modal === 'change' || modal === 'disable') && (
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setError(null); }}
                  placeholder="Current password"
                  autoFocus
                  className="w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              )}

              {(modal === 'set' || modal === 'change') && (
                <>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                    placeholder="New password (min 8 characters)"
                    autoFocus={modal === 'set'}
                    className="w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    placeholder="Confirm new password"
                    className="w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </>
              )}

              {modal === 'disable' && (
                <p className="text-xs text-neutral-500">
                  This will remove the password and allow anyone on your network to access the editor.
                </p>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}
              {success && <p className="text-xs text-green-400">{success}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={resetModal} disabled={submitting}>
                  Cancel
                </Button>
                {modal === 'set' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSetPassword}
                    disabled={!newPassword || !confirmPassword || submitting}
                  >
                    {submitting ? 'Setting...' : 'Set Password'}
                  </Button>
                )}
                {modal === 'change' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword || submitting}
                  >
                    {submitting ? 'Changing...' : 'Change Password'}
                  </Button>
                )}
                {modal === 'disable' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDisable}
                    disabled={!currentPassword || submitting}
                  >
                    {submitting ? 'Disabling...' : 'Disable'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
