'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { QRCodeConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { buildWifiString } from '@/lib/wifi-qr';

interface QRCodeModuleProps {
  config: QRCodeConfig;
  style: ModuleStyle;
}

export default function QRCodeModule({ config, style }: QRCodeModuleProps) {
  const fgColor = config.fgColor || '#ffffff';
  const bgColor = config.bgColor || 'transparent';
  const mode = config.mode ?? 'custom';

  const qrData = mode === 'wifi'
    ? buildWifiString(config.ssid || '', config.password || '', config.authType || 'WPA', config.hiddenNetwork ?? false)
    : config.data;

  const hasData = mode === 'wifi' ? !!(config.ssid) : !!config.data;

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        {hasData ? (
          <>
            <QRCodeSVG
              value={qrData}
              fgColor={fgColor}
              bgColor={bgColor}
              style={{ width: '80%', height: '80%', maxWidth: '100%', maxHeight: '100%' }}
            />
            {mode === 'wifi' ? (
              <div className="flex flex-col items-center gap-0.5">
                {(config.showNetworkName ?? true) && config.ssid && (
                  <span className="opacity-80 text-center" style={{ fontSize: '0.875em' }}>
                    <WifiIcon /> {config.ssid}
                  </span>
                )}
                {(config.showPassword ?? true) && config.password && config.authType !== 'nopass' && (
                  <span className="opacity-50 text-center font-mono" style={{ fontSize: '0.75em' }}>
                    {config.password}
                  </span>
                )}
                {!(config.showNetworkName ?? true) && !(config.showPassword ?? true) && (
                  <span className="opacity-50 text-center" style={{ fontSize: '0.75em' }}>
                    Scan to connect
                  </span>
                )}
              </div>
            ) : (
              config.label && (
                <span className="opacity-80 text-center" style={{ fontSize: '0.875em' }}>{config.label}</span>
              )
            )}
          </>
        ) : (
          <span className="opacity-50" style={{ fontSize: '0.875em' }}>
            {mode === 'wifi' ? 'Configure WiFi network' : 'Configure QR data'}
          </span>
        )}
      </div>
    </ModuleWrapper>
  );
}

function WifiIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: '1em', height: '1em', display: 'inline', verticalAlign: 'middle', marginRight: '0.25em' }}
    >
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}
