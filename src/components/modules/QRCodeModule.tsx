'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { QRCodeConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface QRCodeModuleProps {
  config: QRCodeConfig;
  style: ModuleStyle;
}

export default function QRCodeModule({ config, style }: QRCodeModuleProps) {
  const fgColor = config.fgColor || '#ffffff';
  const bgColor = config.bgColor || 'transparent';

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        {config.data ? (
          <>
            <QRCodeSVG
              value={config.data}
              fgColor={fgColor}
              bgColor={bgColor}
              style={{ width: '80%', height: '80%', maxWidth: '100%', maxHeight: '100%' }}
            />
            {config.label && (
              <span className="opacity-80 text-center" style={{ fontSize: '0.875em' }}>{config.label}</span>
            )}
          </>
        ) : (
          <span className="opacity-50" style={{ fontSize: '0.875em' }}>Configure QR data</span>
        )}
      </div>
    </ModuleWrapper>
  );
}
