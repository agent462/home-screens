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
              <span className="text-sm opacity-80 text-center">{config.label}</span>
            )}
          </>
        ) : (
          <span className="text-sm opacity-50">Configure QR data</span>
        )}
      </div>
    </ModuleWrapper>
  );
}
