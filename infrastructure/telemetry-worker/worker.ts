/**
 * Home Screens Telemetry Worker
 *
 * Receives anonymous usage beacons from home-screens installs.
 * Upserts by installId into Cloudflare D1 (SQLite).
 *
 * Privacy: Does NOT log or store IP addresses.
 *
 * Deploy:
 *   wrangler d1 create telemetry
 *   wrangler d1 execute telemetry --file=schema.sql
 *   wrangler deploy
 */

interface Env {
  DB: D1Database;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only accept POST /beacon
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/beacon') {
      return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
    }

    try {
      // Read body as text and enforce actual size limit (don't trust content-length)
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > 10_000) {
        return new Response(JSON.stringify({ error: 'Payload too large' }), {
          status: 413,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const body = JSON.parse(text) as Record<string, unknown>;

      // Validate required fields
      const installId = body.installId as string;
      if (!installId || !UUID_RE.test(installId)) {
        return new Response(JSON.stringify({ error: 'Invalid installId' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const beaconVersion = body.beaconVersion as number;
      if (typeof beaconVersion !== 'number' || beaconVersion < 1) {
        return new Response(JSON.stringify({ error: 'Invalid beaconVersion' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Upsert: insert or update, preserving first_seen_at
      await env.DB.prepare(`
        INSERT INTO beacons (
          install_id, first_seen_at, last_seen_at,
          app_version, beacon_version,
          platform, arch, node_version,
          display_width, display_height, display_transform,
          screen_count, module_count, module_types, profile_count,
          weather_provider, transition_effect,
          sleep_enabled, alerts_enabled, auth_enabled,
          has_google_calendar, has_ical_sources, plugin_count,
          raw_payload
        ) VALUES (
          ?1, datetime('now'), datetime('now'),
          ?2, ?3,
          ?4, ?5, ?6,
          ?7, ?8, ?9,
          ?10, ?11, ?12, ?13,
          ?14, ?15,
          ?16, ?17, ?18,
          ?19, ?20, ?21,
          ?22
        )
        ON CONFLICT(install_id) DO UPDATE SET
          last_seen_at = datetime('now'),
          app_version = excluded.app_version,
          beacon_version = excluded.beacon_version,
          platform = excluded.platform,
          arch = excluded.arch,
          node_version = excluded.node_version,
          display_width = excluded.display_width,
          display_height = excluded.display_height,
          display_transform = excluded.display_transform,
          screen_count = excluded.screen_count,
          module_count = excluded.module_count,
          module_types = excluded.module_types,
          profile_count = excluded.profile_count,
          weather_provider = excluded.weather_provider,
          transition_effect = excluded.transition_effect,
          sleep_enabled = excluded.sleep_enabled,
          alerts_enabled = excluded.alerts_enabled,
          auth_enabled = excluded.auth_enabled,
          has_google_calendar = excluded.has_google_calendar,
          has_ical_sources = excluded.has_ical_sources,
          plugin_count = excluded.plugin_count,
          raw_payload = excluded.raw_payload
      `)
        .bind(
          installId,
          body.appVersion ?? null,
          beaconVersion,
          body.platform ?? null,
          body.arch ?? null,
          body.nodeVersion ?? null,
          body.displayWidth ?? null,
          body.displayHeight ?? null,
          body.displayTransform ?? null,
          body.screenCount ?? null,
          body.moduleCount ?? null,
          body.moduleTypes ? JSON.stringify(body.moduleTypes) : null,
          body.profileCount ?? null,
          body.weatherProvider ?? null,
          body.transitionEffect ?? null,
          body.sleepEnabled === true ? 1 : body.sleepEnabled === false ? 0 : null,
          body.alertsEnabled === true ? 1 : body.alertsEnabled === false ? 0 : null,
          body.authEnabled === true ? 1 : body.authEnabled === false ? 0 : null,
          body.hasGoogleCalendar === true ? 1 : body.hasGoogleCalendar === false ? 0 : null,
          body.hasIcalSources === true ? 1 : body.hasIcalSources === false ? 0 : null,
          body.pluginCount ?? null,
          JSON.stringify(body),
        )
        .run();

      return new Response(null, { status: 204, headers: CORS_HEADERS });
    } catch (err) {
      console.error('Beacon error:', err);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};

export default worker;
