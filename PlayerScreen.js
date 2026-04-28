import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import Video from 'react-native-video';
import { MaterialIcons } from '@expo/vector-icons';

import { COLORS, LOGO_APP, BUFFER_CONFIG, FALLBACK_CHANNELS } from './config';

export default function PlayerScreen({ player, channels }) {
  // ─── CHANNEL AKTIF ────────────────────────────────
  const currentChannel =
    channels.find((c) => c.id === player.activeChannelId) || FALLBACK_CHANNELS[0];

  // State lokal untuk mengontrol rotasi URL & kegagalan total
  const [urlIndex, setUrlIndex] = useState(0);
  const [allUrlsFailed, setAllUrlsFailed] = useState(false);

  // Reset index setiap ganti channel
  useEffect(() => {
    setUrlIndex(0);
    setAllUrlsFailed(false);
  }, [currentChannel]);

  // ─── URL AKTIF ─────────────────────────────────────
  const getCurrentUrl = useCallback(() => {
    const urls = currentChannel?.urls;
    if (!urls || urls.length === 0) return '';
    // Jika semua URL sudah gagal, tetap kembalikan string kosong
    if (allUrlsFailed) return '';
    return urls[urlIndex] || '';
  }, [currentChannel, urlIndex, allUrlsFailed]);

  const currentUrl = getCurrentUrl();

  // ─── DETEKSI TIPE STREAM ──────────────────────────
  const isDash = currentUrl?.includes('.mpd');
  const isHls = currentUrl?.includes('.m3u8');

  // ─── SAFE DRM BUILDER (koreksi & tambahan) ────────
  const buildDrm = () => {
    const drm = currentChannel?.drm;
    if (!isDash || !drm) return undefined;

    // Validasi properti minimum tiap skema
    try {
      if (drm.type === 'clearkey' && drm.keyId && drm.key) {
        console.log('🔐 ClearKey DRM applied');
        return {
          type: 'clearkey',
          clearKeys: { [drm.keyId]: drm.key },
        };
      }

      if (drm.type === 'widevine' && drm.license) {
        console.log('🔐 Widevine DRM applied');
        return {
          type: 'widevine',
          licenseServer: drm.license,
          headers: drm.headers || {},
        };
      }

      if (drm.type === 'playready' && drm.license) {
        console.log('🔐 PlayReady DRM applied');
        return {
          type: 'playready',
          licenseServer: drm.license,
          headers: drm.headers || {},
        };
      }

      console.warn('⚠️ DRM tidak valid, diabaikan');
      return undefined;
    } catch (e) {
      console.error('❌ DRM build error:', e);
      return undefined;
    }
  };

  // ─── COBA URL BERIKUTNYA ──────────────────────────
  const tryNextUrl = () => {
    const urls = currentChannel?.urls;
    if (!urls || urls.length === 0) {
      setAllUrlsFailed(true);
      return;
    }

    if (urlIndex + 1 < urls.length) {
      console.log(`🔁 Mencoba URL ${urlIndex + 1}`);
      setUrlIndex((prev) => prev + 1);
      // Trigger remount Video dengan key baru
      player.setPlayerKey((k) => k + 1);
    } else {
      console.log('❌ Semua URL gagal');
      setAllUrlsFailed(true);
    }
  };

  // ─── RETRY DARI AWAL ──────────────────────────────
  const retryFromStart = () => {
    setUrlIndex(0);
    setAllUrlsFailed(false);
    player.setPlayerKey((k) => k + 1);
  };

  // ─── DEBUG LOG ─────────────────────────────────────
  useEffect(() => {
    console.log('🎬 PUTAR:', currentUrl || '(tidak ada stream)');
    console.log('📺 Tipe:', isDash ? 'DASH' : isHls ? 'HLS' : 'OTHER');
    console.log('🔐 DRM:', currentChannel.drm);
  }, [currentUrl]);

  return (
    <View style={styles.container}>
      {/* ─── KONTEN VIDEO (selalu tampil, fallback jika kosong) ─── */}
      <View style={styles.videoContainer}>
        {currentUrl ? (
          <Video
            key={player.playerKey}
            ref={player.videoRef}
            source={{
              uri: currentUrl,
              headers:
                Object.keys(player.currentHeaders).length > 0
                  ? player.currentHeaders
                  : undefined,
            }}
            drm={buildDrm()}
            style={styles.video}
            resizeMode="contain"
            controls={false}
            muted={player.isMuted}
            paused={player.appState !== 'active'}
            onLoadStart={() => {
              console.log('⏳ Memuat...');
              player.setIsVideoLoading(true);
            }}
            onLoad={() => {
              console.log('✅ Loaded');
              player.setIsVideoLoading(false);
            }}
            onBuffer={({ isBuffering }) => {
              console.log('📡 Buffer:', isBuffering);
              player.setIsVideoLoading(isBuffering);
            }}
            onError={(e) => {
              console.log('❌ Error:', JSON.stringify(e, null, 2));
              player.setIsVideoLoading(false);
              tryNextUrl();
            }}
            bufferConfig={BUFFER_CONFIG}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ff6666" />
            <Text style={styles.fallbackText}>
              {allUrlsFailed
                ? 'Semua stream gagal diputar.\nMungkin lisensi DRM tidak valid.'
                : 'Tidak ada stream tersedia'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryFromStart}
            >
              <MaterialIcons name="refresh" size={22} color="#fff" />
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* LOADING OVERLAY */}
      {player.isVideoLoading && currentUrl !== '' && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* TAP CONTROL (layar penuh) */}
      <TouchableWithoutFeedback onPress={player.toggleControls}>
        <View style={StyleSheet.absoluteFill}>
          {player.showControls && (
            <View style={styles.controls}>
              {/* Top bar */}
              <View style={styles.topBar}>
                <Text style={styles.title} numberOfLines={1}>
                  {currentChannel.name || 'Channel'}
                </Text>
                <Image
                  source={{ uri: LOGO_APP }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Bottom bar */}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  onPress={() => player.setIsMuted((m) => !m)}
                  accessibilityLabel="Volume"
                >
                  <MaterialIcons
                    name={player.isMuted ? 'volume-off' : 'volume-up'}
                    size={26}
                    color="#fff"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={player.toggleCustomFullscreen}
                  accessibilityLabel="Fullscreen"
                >
                  <MaterialIcons
                    name={
                      player.isFullscreen
                        ? 'fullscreen-exit'
                        : 'fullscreen'
                    }
                    size={26}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

// ─── STYLES ─────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  // Fallback saat tidak ada stream / semua gagal
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e53935',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Loading overlay (hanya di atas video)
  loading: {
    position: 'absolute',
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  // Kontrol UI
  controls: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 15,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    flex: 1,
    marginRight: 10,
  },
  logo: {
    width: 80,
    height: 30,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginBottom: 10,
  },
});