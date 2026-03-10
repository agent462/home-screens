'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { RainMapConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';

interface RainMapModuleProps {
  config: RainMapConfig;
  style: ModuleStyle;
  latitude?: number;
  longitude?: number;
}

interface RainFrame {
  time: number;
  path: string;
}

interface RainViewerData {
  host: string;
  radar: {
    past: RainFrame[];
    nowcast: RainFrame[];
  };
}

// ── Tile math (standard Web Mercator) ──

function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

const TILE_SIZE = 256;
const MAX_RADAR_ZOOM = 7;

const BASE_TILE_URLS: Record<string, string> = {
  dark: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  standard: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};

function formatFrameTime(unixTime: number): string {
  const now = Date.now() / 1000;
  const diffMin = Math.round((unixTime - now) / 60);
  if (Math.abs(diffMin) <= 1) return 'Now';
  if (diffMin < 0) return `${Math.abs(diffMin)}m ago`;
  return `+${diffMin}m`;
}

export default function RainMapModule({
  config,
  style,
  latitude,
  longitude,
}: RainMapModuleProps) {
  const lat = config.latitude || latitude || 40;
  const lon = config.longitude || longitude || -74;
  const zoom = config.zoom ?? 6;
  const animationSpeedMs = config.animationSpeedMs ?? 500;
  const extraDelayLastFrameMs = config.extraDelayLastFrameMs ?? 2000;
  const smooth = config.smooth !== false ? 1 : 0;
  const snow = config.showSnow !== false ? 1 : 0;
  const radarOpacity = config.opacity ?? 0.7;
  const showTimestamp = config.showTimestamp !== false;
  const showTimeline = config.showTimeline !== false;
  const mapStyle = config.mapStyle ?? 'dark';
  const colorScheme = config.colorScheme ?? 2;
  const refreshMs = config.refreshIntervalMs ?? 600000;

  const data = useFetchData<RainViewerData>('/api/rain-map', refreshMs);

  const [displayIndex, setDisplayIndex] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const preloadedRef = useRef<Set<string>>(new Set());

  // Combine past + nowcast frames
  const frames = useMemo(() => {
    if (!data?.radar) return [];
    return [...(data.radar.past ?? []), ...(data.radar.nowcast ?? [])];
  }, [data]);

  // Radar zoom is capped at 7 by the RainViewer API; above that we upscale
  const radarZoom = Math.min(zoom, MAX_RADAR_ZOOM);
  const radarScale = Math.pow(2, zoom - radarZoom); // 1 at zoom ≤ 7, 2 at 8, 4 at 9, etc.

  // Calculate base map tile grid (uses full zoom)
  const tileGrid = useMemo(() => {
    const centerTileX = lon2tile(lon, zoom);
    const centerTileY = lat2tile(lat, zoom);
    const tileX = Math.floor(centerTileX);
    const tileY = Math.floor(centerTileY);
    const offsetX = (centerTileX - tileX) * TILE_SIZE;
    const offsetY = (centerTileY - tileY) * TILE_SIZE;

    const gridRadius = 2;
    const tiles: Array<{ x: number; y: number; px: number; py: number }> = [];
    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        tiles.push({
          x: tileX + dx,
          y: tileY + dy,
          px: (dx + gridRadius) * TILE_SIZE - offsetX,
          py: (dy + gridRadius) * TILE_SIZE - offsetY,
        });
      }
    }

    const totalSize = (gridRadius * 2 + 1) * TILE_SIZE;
    return { tiles, totalSize };
  }, [lat, lon, zoom]);

  // Calculate radar tile grid (uses capped zoom, scaled up to match base map)
  const radarTileGrid = useMemo(() => {
    const centerTileX = lon2tile(lon, radarZoom);
    const centerTileY = lat2tile(lat, radarZoom);
    const tileX = Math.floor(centerTileX);
    const tileY = Math.floor(centerTileY);
    const offsetX = (centerTileX - tileX) * TILE_SIZE * radarScale;
    const offsetY = (centerTileY - tileY) * TILE_SIZE * radarScale;

    // Fewer radar tiles needed since each one covers a larger area when scaled
    const gridRadius = Math.ceil(2 / radarScale) + 1;
    const tiles: Array<{ x: number; y: number; px: number; py: number }> = [];
    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        tiles.push({
          x: tileX + dx,
          y: tileY + dy,
          px: (dx + gridRadius) * TILE_SIZE * radarScale - offsetX,
          py: (dy + gridRadius) * TILE_SIZE * radarScale - offsetY,
        });
      }
    }

    const scaledSize = TILE_SIZE * radarScale;
    const totalSize = (gridRadius * 2 + 1) * scaledSize;
    return { tiles, totalSize, scaledSize };
  }, [lat, lon, radarZoom, radarScale]);

  // Build radar tile URL for a given frame
  const getRadarUrl = useCallback(
    (frame: RainFrame, tile: { x: number; y: number }) => {
      if (!data?.host) return '';
      return `${data.host}${frame.path}/${TILE_SIZE}/${radarZoom}/${tile.x}/${tile.y}/${colorScheme}/${smooth}_${snow}.png`;
    },
    [data?.host, radarZoom, colorScheme, smooth, snow],
  );

  // Preload all radar tile images
  useEffect(() => {
    if (!frames.length || !data?.host || !radarTileGrid.tiles.length) return;

    const urls = new Set<string>();
    for (const frame of frames) {
      for (const tile of radarTileGrid.tiles) {
        urls.add(getRadarUrl(frame, tile));
      }
    }

    // Only preload new URLs
    const newUrls = [...urls].filter((u) => u && !preloadedRef.current.has(u));
    if (newUrls.length === 0) {
      setImagesReady(true);
      return;
    }

    let loaded = 0;
    const total = newUrls.length;

    for (const url of newUrls) {
      const img = new Image();
      img.onload = img.onerror = () => {
        preloadedRef.current.add(url);
        loaded++;
        if (loaded >= total) setImagesReady(true);
      };
      img.src = url;
    }
  }, [frames, data?.host, radarTileGrid.tiles, getRadarUrl]);

  // Animation loop — uses ref to avoid re-render cascades
  useEffect(() => {
    if (!frames.length || !imagesReady) return;

    // Reset to start when frames change
    indexRef.current = 0;
    setDisplayIndex(0);

    let cancelled = false;

    function scheduleNext() {
      if (cancelled) return;
      const current = indexRef.current;
      const next = (current + 1) % frames.length;
      const isLooping = next === 0;
      const delay = isLooping ? extraDelayLastFrameMs : animationSpeedMs;

      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        indexRef.current = next;
        setDisplayIndex(next);
        scheduleNext();
      }, delay);
    }

    scheduleNext();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [frames, imagesReady, animationSpeedMs, extraDelayLastFrameMs]);

  if (!data) {
    return (
      <ModuleWrapper style={style}>
        <p className="text-center opacity-50">Loading rain map...</p>
      </ModuleWrapper>
    );
  }

  if (!frames.length) {
    return (
      <ModuleWrapper style={style}>
        <p className="text-center opacity-50">No radar data available</p>
      </ModuleWrapper>
    );
  }

  const currentFrame = frames[displayIndex];
  if (!currentFrame) return null;
  const baseUrl = BASE_TILE_URLS[mapStyle] ?? BASE_TILE_URLS.dark;
  const pastCount = data.radar.past?.length ?? 0;

  return (
    <ModuleWrapper style={style}>
      <div className="relative w-full h-full overflow-hidden rounded-lg">
        {/* Base map tiles */}
        <div
          className="absolute"
          style={{
            width: tileGrid.totalSize,
            height: tileGrid.totalSize,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {tileGrid.tiles.map((tile) => (
            <img
              key={`base-${tile.x}-${tile.y}`}
              src={baseUrl
                .replace('{z}', String(zoom))
                .replace('{x}', String(tile.x))
                .replace('{y}', String(tile.y))}
              alt=""
              className="absolute"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                left: tile.px,
                top: tile.py,
              }}
              draggable={false}
            />
          ))}

        </div>

        {/* Radar overlay tiles for current frame (own container, scaled up beyond zoom 7) */}
        <div
          className="absolute"
          style={{
            width: radarTileGrid.totalSize,
            height: radarTileGrid.totalSize,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {radarTileGrid.tiles.map((tile) => (
            <img
              key={`radar-${tile.x}-${tile.y}-${currentFrame.time}`}
              src={getRadarUrl(currentFrame, tile)}
              alt=""
              className="absolute"
              style={{
                width: radarTileGrid.scaledSize,
                height: radarTileGrid.scaledSize,
                left: tile.px,
                top: tile.py,
                opacity: radarOpacity,
                imageRendering: radarScale > 1 ? 'pixelated' : undefined,
              }}
              draggable={false}
            />
          ))}
        </div>

        {/* Center marker dot */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-800 z-10"
          style={{ boxShadow: '0 0 4px rgba(0,0,0,0.6)' }}
        />

        {/* Timestamp */}
        {showTimestamp && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10 font-mono">
            {formatFrameTime(currentFrame.time)}
          </div>
        )}

        {/* Timeline dots */}
        {showTimeline && frames.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {frames.map((frame, i) => {
              const isNowcast = i >= pastCount;
              const isCurrent = i === displayIndex;
              return (
                <div
                  key={frame.time}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: isCurrent ? 8 : 5,
                    height: isCurrent ? 8 : 5,
                    backgroundColor: isCurrent
                      ? '#ffffff'
                      : isNowcast
                        ? 'rgba(74, 222, 128, 0.6)'
                        : 'rgba(255, 255, 255, 0.35)',
                    boxShadow: isCurrent ? '0 0 4px rgba(255,255,255,0.5)' : 'none',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </ModuleWrapper>
  );
}
