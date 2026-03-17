'use client';

import type { FlagStatusConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { ModuleLoadingState } from './ModuleStates';
import { useFetchData } from '@/hooks/useFetchData';
import { flagStatusUrl } from '@/lib/fetch-keys';
import { isUSTimezone } from '@/lib/timezone-us';

interface FlagStatusModuleProps {
  config: FlagStatusConfig;
  style: ModuleStyle;
  timezone?: string;
}

interface FlagData {
  status: 'full-staff' | 'half-staff';
  reason?: string;
  orderFrom?: string;
  url?: string;
}

function FlagVisual({ isHalfStaff }: { isHalfStaff: boolean }) {
  // Flag dimensions within the viewBox
  const flagW = 70;
  const flagH = 37;
  const poleX = 15;
  const poleTop = 10;
  const poleBottom = 190;
  const finialR = 5;

  // Flag Y position: full-staff = just below finial, half-staff = flag top at pole midpoint
  const fullStaffY = poleTop + finialR * 2 + 2;
  const halfStaffY = (poleTop + poleBottom) / 2;
  const flagY = isHalfStaff ? halfStaffY : fullStaffY;

  const stripeH = flagH / 13;
  const cantonW = flagW * 0.4;
  const cantonH = stripeH * 7;

  return (
    <svg viewBox="0 0 120 200" className="w-full h-auto max-h-[60%]">
      {/* Flagpole */}
      <line
        x1={poleX} y1={poleTop + finialR}
        x2={poleX} y2={poleBottom}
        stroke="#9ca3af" strokeWidth={3} strokeLinecap="round"
      />
      {/* Gold finial ball */}
      <circle cx={poleX} cy={poleTop + finialR} r={finialR} fill="#d4a017" />

      {/* Flag group with transition */}
      <g style={{ transition: 'transform 1.5s ease-in-out', transform: `translateY(${flagY}px)` }}>
        {/* 13 stripes */}
        {Array.from({ length: 13 }, (_, i) => (
          <rect
            key={i}
            x={poleX + 1}
            y={i * stripeH}
            width={flagW}
            height={stripeH}
            fill={i % 2 === 0 ? '#b91c1c' : '#ffffff'}
          />
        ))}
        {/* Blue canton */}
        <rect x={poleX + 1} y={0} width={cantonW} height={cantonH} fill="#1e3a5f" />
        {/* Simplified star grid (5 rows x 6 cols) */}
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => (
            <text
              key={`${row}-${col}`}
              x={poleX + 1 + cantonW * (col + 0.5) / 6}
              y={cantonH * (row + 0.55) / 5}
              fontSize={3.2}
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="central"
            >
              *
            </text>
          ))
        )}
      </g>
    </svg>
  );
}

export default function FlagStatusModule({ config, style, timezone }: FlagStatusModuleProps) {
  const usTimezone = isUSTimezone(timezone);
  const [data, error] = useFetchData<FlagData>(usTimezone ? flagStatusUrl() : '', config.refreshIntervalMs);

  // Hide entirely for non-US timezones
  if (!usTimezone) return null;

  if (data === null) {
    return <ModuleLoadingState style={style} message="Loading flag status..." error={error} />;
  }

  const isHalfStaff = data.status === 'half-staff';

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <FlagVisual isHalfStaff={isHalfStaff} />
        <p className="text-center font-medium" style={{ fontSize: '1.1em' }}>
          {isHalfStaff ? 'Half-Staff' : 'Full Staff'}
        </p>
        {isHalfStaff && config.showReason && data.reason && (
          <p className="text-center opacity-70 leading-snug" style={{ fontSize: '0.8em' }}>
            {data.reason}
          </p>
        )}
      </div>
    </ModuleWrapper>
  );
}
