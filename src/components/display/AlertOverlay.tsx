'use client';

import { useEffect } from 'react';
import { useAlertStore, type DisplayAlert } from '@/stores/alert-store';
import type { AlertSettings } from '@/types/config';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface AlertOverlayProps {
  alertSettings?: AlertSettings;
  displayState?: 'active' | 'dimmed' | 'asleep';
  scale?: number;
}

const TYPE_COLORS: Record<DisplayAlert['type'], { bg: string; border: string; icon: string }> = {
  info: {
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.4)',
    icon: '#3b82f6',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    icon: '#f59e0b',
  },
  urgent: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    icon: '#ef4444',
  },
};

const TYPE_ICONS: Record<DisplayAlert['type'], typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  urgent: AlertCircle,
};

function AlertItem({ alert, onDismiss }: { alert: DisplayAlert; onDismiss: (id: string) => void }) {
  const colors = TYPE_COLORS[alert.type] ?? TYPE_COLORS.info;
  const Icon = TYPE_ICONS[alert.type] ?? TYPE_ICONS.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 12,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: '#fff',
        maxWidth: 480,
        width: '100%',
        animation: 'alert-slide-in 0.3s ease-out',
        pointerEvents: 'auto',
      }}
    >
      <Icon
        style={{ width: 20, height: 20, color: colors.icon, flexShrink: 0, marginTop: 2 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {alert.title && (
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: '20px' }}>
            {alert.icon ? `${alert.icon} ` : ''}{alert.title}
          </div>
        )}
        {alert.message && (
          <div style={{
            fontSize: 13,
            lineHeight: '18px',
            opacity: 0.85,
            marginTop: alert.title ? 2 : 0,
          }}>
            {alert.message}
          </div>
        )}
      </div>
      {alert.dismissible !== false && (
        <button
          onClick={() => onDismiss(alert.id)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            padding: 2,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      )}
    </div>
  );
}

export default function AlertOverlay({ alertSettings, displayState = 'active', scale = 1 }: AlertOverlayProps) {
  const { alerts, maxVisible, position, enabled, configure, dismissAlert } = useAlertStore();

  // Sync store config whenever settings change
  useEffect(() => {
    configure({
      enabled: alertSettings?.enabled ?? true,
      position: alertSettings?.position ?? 'top',
      maxVisible: alertSettings?.maxVisible ?? 3,
      defaultDuration: alertSettings?.defaultDuration ?? 0,
    });
  }, [
    alertSettings?.enabled,
    alertSettings?.position,
    alertSettings?.maxVisible,
    alertSettings?.defaultDuration,
    configure,
  ]);

  if (!enabled || alerts.length === 0 || displayState !== 'active') return null;

  const visible = alerts.slice(-maxVisible);

  return (
    <>
      <style>{`
        @keyframes alert-slide-in {
          from { opacity: 0; transform: translateY(${position === 'top' ? '-12px' : '12px'}); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          [position === 'top' ? 'top' : 'bottom']: 0,
          zIndex: 9998, // Same as Screensaver, but they're never visible simultaneously (alerts only render when active)
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '16px 24px',
          pointerEvents: 'none',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: position === 'top' ? 'top center' : 'bottom center',
        }}
      >
        {visible.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onDismiss={dismissAlert} />
        ))}
      </div>
    </>
  );
}
