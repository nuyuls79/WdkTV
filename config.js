// ─── config.js ───────────────────────────────────────────────

export const COLORS = {
  background:    '#121212',
  listBg:        '#2A2A2A',
  overlayBg:     'rgba(0,0,0,0.75)',
  accentRed:     '#FF2400',
  primaryPurple: '#b39ddb',
  navBg:         '#1A1A1A',
  errorBg:       'rgba(30,0,0,0.92)',
  errorBorder:   '#FF2400',
};

// PERBAIKAN: Format url diubah menjadi urls (array) dan ditambahkan urlIndex (Bug 1)
export const FALLBACK_CHANNELS = [{
  id: '1', 
  name: 'Siaran Tidak Tersedia',
  logo: 'https://ui-avatars.com/api/?name=TV&background=000&color=fff',
  urls: ['https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'],
  urlIndex: 0,
  group: 'General', 
  headers: {},
  licenseKey: null
}];

export const LOGO_APP = 'https://raw.githubusercontent.com/amanhnb88/AdiTV-App/main/icon1.png?v=baru';
export const ERROR_SKIP_DELAY = 5;

// TAMBAHAN REKOMENDASI AUDIT: Memindahkan konstanta dari App.js ke config.js
export const CONTROL_HIDE_DELAY = 6000;  // Waktu sebelum kontrol overlay hilang (ms)
export const MAX_LOGS = 80;              // Batas maksimal baris log di Logcat

export const BUFFER_CONFIG = {
  minBufferMs: 15000,
  maxBufferMs: 50000,
  bufferForPlaybackMs: 2500,
  bufferForPlaybackAfterRebufferMs: 5000,
};
