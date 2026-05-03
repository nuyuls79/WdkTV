import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, BackHandler, Alert } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';

import { CONTROL_HIDE_DELAY } from './config';
import { parseVideoError } from './errorHandler';

// ─── UTILS DRM ──────────────────────────────────────────────────────────────
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const btoa = (input) => {
  let str = String(input), output = '';
  for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3/4);
    block = block << 8 | charCode;
  }
  return output;
};

const hexToBase64 = (hexstring) => {
  const match = hexstring.match(/\w{2}/g);
  if (!match) return '';
  const str = String.fromCharCode.apply(null, match.map(a => parseInt(a, 16)));
  return btoa(str);
};

// 🔁 FUNGSI BARU: Membaca objek drm dari parser.js
const buildDrmConfig = (ch) => {
  const drm = ch.drm;
  if (!drm) return undefined;

  // ClearKey
  if (drm.type === 'clearkey' && drm.keyId && drm.key) {
    const licenseObj = {
      keys: [{ kty: 'oct', k: hexToBase64(drm.key), kid: hexToBase64(drm.keyId) }],
      type: 'temporary'
    };
    return {
      type: 'clearkey',
      licenseServer: `data:application/json;base64,${btoa(JSON.stringify(licenseObj))}`,
      headers: {}
    };
  }

  // Widevine / PlayReady (✅ sudah disesuaikan)
  if ((drm.type === 'widevine' || drm.type === 'playready') && drm.license) {
    return {
      type: drm.type,
      licenseServer: drm.license,
      headers: drm.headers || {},
      // ✅ Tambahan untuk mencegah pemutaran berhenti prematur
      multiSession: true,
      contentId: drm.contentId || undefined,
    };
  }

  return undefined;
};

// ─── CUSTOM HOOK: usePlayer ──────────────────────────────────────────────────
export const usePlayer = (channels, addLog) => {
  const videoRef = useRef(null);
  const hideTimer = useRef(null);

  const activeChannelRef = useRef(null);
  const urlIndexRef = useRef(0);

  // State Pemutar
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentHeaders, setCurrentHeaders] = useState({});
  const [currentDrm, setCurrentDrm] = useState(undefined);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playerKey, setPlayerKey] = useState(Date.now());
  const [resizeMode, setResizeMode] = useState('contain');
  const [appState, setAppState] = useState(AppState.currentState);

  const [allUrlsFailed, setAllUrlsFailed] = useState(false);

  // State UI
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // State Tracks (Video/Audio/Subtitle)
  const [availableVideoTracks, setAvailableVideoTracks] = useState([]);
  const [availableAudioTracks, setAvailableAudioTracks] = useState([]);
  const [availableTextTracks, setAvailableTextTracks] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState({ type: 'auto' });
  const [selectedAudio, setSelectedAudio] = useState({ type: 'system' });
  const [selectedText, setSelectedText] = useState({ type: 'disabled' });

  // ─── FUNGSI KONTROL PEMUTAR ─────────────────────────────────────────────────
  const changeChannel = useCallback((ch) => {
    if (!ch || !ch.urls || ch.urls.length === 0) { 
      addLog("ERROR", `URL kosong: ${ch?.name || 'Unknown'}`); 
      return; 
    }

    activeChannelRef.current = ch;
    urlIndexRef.current = 0;
    setAllUrlsFailed(false);

    const urlToPlay = ch.urls[0];
    
    addLog("PLAYER", `▶ ${ch.name} (Memuat URL 1/${ch.urls.length})`);
    const drmConfig = buildDrmConfig(ch);
    if (drmConfig) addLog("DRM", `Menerapkan ${drmConfig.type} DRM...`);

    setCurrentUrl(urlToPlay);
    setCurrentHeaders(ch.headers || {});
    setCurrentDrm(drmConfig);
    setActiveChannelId(ch.id);
    setPlayerKey(Date.now());
    setShowControls(false);
    setIsVideoLoading(true);
    
    setSelectedVideo({ type: 'auto' });
    setSelectedAudio({ type: 'system' });
    setSelectedText({ type: 'disabled' });
    setAvailableVideoTracks([]);
    setAvailableAudioTracks([]);
    setAvailableTextTracks([]);
  }, [addLog]);

  // Handler Error dari ExoPlayer
  const handleVideoError = useCallback((e) => {
    const ch = activeChannelRef.current;
    
    if (ch && urlIndexRef.current + 1 < ch.urls.length) {
      urlIndexRef.current++;
      addLog("FALLBACK", `Mencoba URL alternatif ${urlIndexRef.current + 1}/${ch.urls.length}`);
      setCurrentUrl(ch.urls[urlIndexRef.current]);
      setPlayerKey(Date.now());
    } else {
      setIsVideoLoading(false);
      setAllUrlsFailed(true);
      const errInfo = parseVideoError(e);
      addLog("ERROR", `❌ ${errInfo.detail}`);
      if (currentDrm) addLog("DRM", "Kunci lisensi DRM mungkin sudah kadaluarsa.");
    }
  }, [addLog, currentDrm]);

  // ─── KONTROL UI ────────────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), CONTROL_HIDE_DELAY);
  }, []);

  const toggleControls = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      setShowControls(true);
      resetHideTimer();
    }
  }, [showControls, resetHideTimer]);

  const toggleResizeMode = useCallback(() => {
    setResizeMode(prev => prev === 'contain' ? 'cover' : prev === 'cover' ? 'stretch' : 'contain');
    resetHideTimer();
  }, [resetHideTimer]);

  const toggleCustomFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    }
    NavigationBar.setVisibilityAsync('hidden');
  }, [isFullscreen]);

  // ─── LIFECYCLE PLAYER ──────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      setAppState(next);
      if (next === 'active') {
        addLog("SYSTEM", "App aktif kembali, reload player");
        setPlayerKey(Date.now());
        setIsVideoLoading(true);
        setAllUrlsFailed(false);
      }
    });
    return () => sub.remove();
  }, [addLog]);

  useEffect(() => {
    const init = async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
      } catch {}
    };
    init();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      ScreenOrientation.unlockAsync();
    };
  }, []);

  return {
    videoRef, currentUrl, currentHeaders, currentDrm, activeChannelId, activeChannelRef,
    isVideoLoading, setIsVideoLoading, isMuted, setIsMuted, playerKey, resizeMode, appState,
    showControls, setShowControls, isFullscreen, setIsFullscreen,
    showSettings, setShowSettings, showCategoryModal, setShowCategoryModal,
    availableVideoTracks, setAvailableVideoTracks, selectedVideo, setSelectedVideo,
    availableAudioTracks, setAvailableAudioTracks, selectedAudio, setSelectedAudio,
    availableTextTracks, setAvailableTextTracks, selectedText, setSelectedText,
    changeChannel, handleVideoError, toggleControls, resetHideTimer, toggleResizeMode, toggleCustomFullscreen,
    allUrlsFailed
  };
};