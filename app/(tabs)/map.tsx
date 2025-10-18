import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { Detection } from '../../lib/supabase';

/**
 * Map prototype: renders a Leaflet map inside a WebView for quick cross-platform prototyping.
 * - If `supabase` is configured, the map will fetch detections from the database and plot them.
 * - Otherwise it will show sample points to let you iterate on UI quickly.
 */

const SAMPLE_POINTS: Detection[] = [
  {
    id: 'sample-1',
    device_id: 'TEST-001',
    timestamp: new Date().toISOString(),
    latitude: -42.88,
    longitude: 147.33,
    model_name: 'BirdNET',
    confidence: 0.92,
    audio_file_url: undefined,
  } as Detection,
  {
    id: 'sample-2',
    device_id: 'TEST-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    latitude: -42.9,
    longitude: 147.35,
    model_name: 'BirdNET',
    confidence: 0.85,
  } as Detection,
];

export default function MapScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Map HTML performs its own data fetching; just render the WebView immediately.
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  // Build HTML for the WebView by injecting supabase config from app extras.
  const extras = (Constants.expoConfig && (Constants.expoConfig as any).extra) || {};
  const SUPABASE_URL = extras.supabaseUrl || '';
  const SUPABASE_ANON_KEY = extras.supabaseAnonKey || '';
  const html = buildMapHtml({ SUPABASE_URL, SUPABASE_ANON_KEY, samplePoints: SAMPLE_POINTS });

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html } as any}
        style={styles.webview}
        allowFileAccess={true}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data && data.level) {
              // bridge web logs into RN console
              if (data.level === 'error') console.error('[WEBVIEW]', ...data.args);
              else if (data.level === 'warn') console.warn('[WEBVIEW]', ...data.args);
              else console.log('[WEBVIEW]', ...data.args);
            } else {
              console.log('[WEBVIEW]', e.nativeEvent.data);
            }
          } catch {
            console.log('[WEBVIEW]', e.nativeEvent.data);
          }
        }}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        // capture JS errors also
        injectedJavaScriptBeforeContentLoaded={`(function(){
          try{
            window.SUPABASE_CONFIG = window.SUPABASE_CONFIG || ${JSON.stringify({ SUPABASE_URL, SUPABASE_ANON_KEY })};
            const send=(level,args)=>{ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({level, args: Array.from(args)})); }catch(e){} };
            ['log','warn','error','info'].forEach(l=>{ const orig = console[l]; console[l]=function(){ send(l, arguments); try{ orig.apply(console, arguments); }catch(e){} }; });
            window.addEventListener('error', function(e){ send('error',[e.message || e.toString()]); });
          }catch(e){}
        })();`}
      />
    </View>
  );
}

function buildMapHtml(opts: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string; samplePoints?: Detection[] }) {
  const SUPABASE_URL = opts.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = opts.SUPABASE_ANON_KEY || '';
  const sample = (opts.samplePoints || []).map((p) => ({
    id: p.id,
    lat: p.latitude,
    lng: p.longitude,
    confidence: p.confidence,
    device: p.device_id,
    ts: p.timestamp,
    url: p.audio_file_url || null,
    model_name: p.model_name || 'BirdNET',
  }));

  const sampleJson = JSON.stringify(sample);

  const restEndpoint = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/detections?select=id,device_id,timestamp,latitude,longitude,model_name,confidence,audio_file_url&order=timestamp.desc&limit=1000` : '';

  return `
  <!doctype html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
    <style>
      html,body,#map { height: 100%; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif }
      #controls { position: absolute; top: 8px; left: 8px; z-index: 999; background: rgba(255,255,255,0.95); padding: 8px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
      .control-row { display:flex; align-items:center; gap:8px }
      #speciesList { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; max-width:380px }
      .species-chip { display:flex; align-items:center; gap:6px; padding:4px; border-radius:6px; background:#f3f4f6; cursor:pointer; opacity:0.6 }
      .species-chip.selected { background:#fff; opacity:1; box-shadow:0 1px 3px rgba(0,0,0,0.1) }
      .species-chip img { width:32px; height:32px; border-radius:4px }
      .species-chip .label { font-size:12px }
      #playerBar { position:absolute; bottom:8px; left:8px; right:8px; z-index:999; background: rgba(255,255,255,0.95); padding:6px; border-radius:6px }
      .info-card { font-size:14px }
      .confidence { font-weight:700; color:#059669 }
    </style>
  </head>
  <body>
    <div id="controls">
      <div class="control-row">
        <label>Confidence ≥ <span id="confLabel">0%</span></label>
        <input id="confSlider" type="range" min="0" max="100" value="0" />
        <button id="refreshBtn">Refresh</button>
        <label><input id="autoRefresh" type="checkbox"/> Auto-refresh</label>
      </div>
      <div id="speciesList"></div>
    </div>
    <div id="playerBar"><audio id="player" controls style="width:100%"></audio></div>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster-src.js"></script>
    <script>
      const SUPABASE_URL = ${JSON.stringify(SUPABASE_URL)};
      const SUPABASE_ANON_KEY = ${JSON.stringify(SUPABASE_ANON_KEY)};
      const SAMPLE_POINTS = ${sampleJson};
      const restEndpoint = ${JSON.stringify(restEndpoint)};

      const map = L.map('map').setView([-42.88785,147.32189], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

      let markersLayer = L.markerClusterGroup();
      map.addLayer(markersLayer);

      let allPoints = [];
      let selectedSpecies = new Set();
      let confThreshold = 0;

      const player = document.getElementById('player');
      const confSlider = document.getElementById('confSlider');
      const confLabel = document.getElementById('confLabel');
      const speciesList = document.getElementById('speciesList');
      const refreshBtn = document.getElementById('refreshBtn');
      const autoRefresh = document.getElementById('autoRefresh');

      confSlider.addEventListener('input', () => {
        confThreshold = Number(confSlider.value)/100;
        confLabel.textContent = confSlider.value + '%';
        renderMarkers();
      });

      refreshBtn.addEventListener('click', () => fetchAndRender(true));
      let refreshTimer = null;
      autoRefresh.addEventListener('change', (e) => {
        if (autoRefresh.checked) {
          if (refreshTimer) clearInterval(refreshTimer);
          refreshTimer = setInterval(() => fetchAndRender(true), 30000);
        } else {
          if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
        }
      });

      function getSpeciesName(p) { return p.species || p.common_name || p.model_name || 'Unknown'; }
      function createIcon(conf) {
        const color = conf >= 0.9 ? '#059669' : conf >= 0.8 ? '#10b981' : '#f59e0b';
        const html = '<div style="background:' + color + ';width:16px;height:16px;border-radius:50%;border:2px solid white"></div>';
        return L.divIcon({ html: html, className: 'dot-icon', iconSize: [20,20] });
      }
      function createPopupHtml(m) {
        const confText = (m.confidence*100).toFixed(1) + '%';
        const species = getSpeciesName(m);
        const time = new Date(m.ts).toLocaleString();
        const audioButton = m.url ? ('<div><a href="#" class="play-inline" data-url="' + m.url + '">Play inline</a></div>') : '';
        return '<div class="info-card"><div><span class="confidence">' + confText + '</span> — ' + species + '</div><div>' + m.device + '</div><div>' + time + '</div>' + audioButton + '</div>';
      }

      document.addEventListener('click', (ev) => {
        const el = ev.target;
        if (el && el.classList && el.classList.contains('play-inline')) {
          ev.preventDefault();
          const url = el.getAttribute('data-url');
          if (url) { player.src = url; player.play().catch(()=>{}); }
        }
      });

      function buildSpeciesUI(points) {
        const speciesSet = new Map();
        points.forEach(p => { const s = getSpeciesName(p); speciesSet.set(s, (speciesSet.get(s) || 0) + 1); });
        speciesList.innerHTML = '';
        speciesSet.forEach((count, name) => {
          const chip = document.createElement('div');
          chip.className = 'species-chip';
          chip.dataset.species = name;
          const initials = name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
          chip.innerHTML = '<img src="https://via.placeholder.com/40?text=' + encodeURIComponent(initials) + '" alt="' + name + '" /><div class="label">' + name + '</div>';
          chip.addEventListener('click', () => { if (selectedSpecies.has(name)) { selectedSpecies.delete(name); chip.classList.remove('selected'); } else { selectedSpecies.add(name); chip.classList.add('selected'); } renderMarkers(); });
          speciesList.appendChild(chip);
        });
      }

      function renderMarkers() {
        markersLayer.clearLayers();
        const filtered = allPoints.filter(p => {
          const lat = (typeof p.lat === 'number') ? p.lat : p.latitude;
          const lng = (typeof p.lng === 'number') ? p.lng : p.longitude;
          if (typeof lat !== 'number' || typeof lng !== 'number') return false;
          if (p.confidence < confThreshold) return false;
          if (selectedSpecies.size > 0) return selectedSpecies.has(getSpeciesName(p));
          return true;
        });
        filtered.forEach(m => {
          const lat = (typeof m.lat === 'number') ? m.lat : m.latitude;
          const lng = (typeof m.lng === 'number') ? m.lng : m.longitude;
          const marker = L.marker([lat, lng], { icon: createIcon(m.confidence) });
          marker.bindPopup(createPopupHtml(m));
          markersLayer.addLayer(marker);
        });
      }

      async function fetchAndRender(force=false) {
        try {
          let data = [];
          if (restEndpoint && SUPABASE_ANON_KEY) {
            const res = await fetch(restEndpoint, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
            if (!res.ok) throw new Error('Fetch failed ' + res.status);
            data = await res.json();
          } else {
            data = SAMPLE_POINTS;
          }
          allPoints = data.map(p => ({ id: p.id, lat: p.latitude || p.lat, lng: p.longitude || p.lng, confidence: p.confidence || 0, device: p.device_id || p.device, ts: p.timestamp || p.ts, url: p.audio_file_url || p.url || null, model_name: p.model_name || null }));
          buildSpeciesUI(allPoints);
          renderMarkers();
        } catch (err) { console.error('Error fetching detections', err); }
      }

      fetchAndRender(true);
    </script>
  </body>
  </html>
  `;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#9ca3af' },
  webContainer: { flex: 1 },
});
