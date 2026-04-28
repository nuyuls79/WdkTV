import React from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, Image,
  ActivityIndicator, TouchableWithoutFeedback, Modal, ScrollView
} from 'react-native';
import Video from 'react-native-video';
import { MaterialIcons } from '@expo/vector-icons';

import { COLORS, LOGO_APP, BUFFER_CONFIG } from './config';
import { FALLBACK_CHANNELS } from './config';

export default function PlayerScreen({ player, channels }) {

  // ─── GET CURRENT CHANNEL ─────────────────────────────
  const currentChannel = channels.find(c => c.id === player.activeChannelId) || FALLBACK_CHANNELS[0];

  // ─── URL ACTIVE ──────────────────────────────────────
  const getCurrentUrl = () => {
    if (!currentChannel.urls || currentChannel.urls.length === 0) return '';
    return currentChannel.urls[currentChannel.urlIndex || 0];
  };

  const currentUrl = getCurrentUrl();

  // ─── DETECT TYPE ─────────────────────────────────────
  const isDash = currentUrl?.includes('.mpd');
  const isHls  = currentUrl?.includes('.m3u8');

  // ─── SAFE DRM BUILDER ────────────────────────────────
  const buildDrm = () => {
    const drm = currentChannel?.drm;

    // ❗ kalau bukan DASH → jangan pakai DRM
    if (!isDash) return undefined;

    if (!drm) return undefined;

    try {
      // CLEARKEY
      if (drm.type === 'clearkey' && drm.keyId && drm.key) {
        console.log('🔐 Using ClearKey');
        return {
          type: 'clearkey',
          clearKeys: {
            [drm.keyId]: drm.key
          }
        };
      }

      // WIDEVINE
      if (drm.type === 'widevine' && drm.license) {
        console.log('🔐 Using Widevine');
        return {
          type: 'widevine',
          licenseServer: drm.license,
          headers: drm.headers || {}
        };
      }

      console.log('⚠️ DRM INVALID → SKIP');
      return undefined;

    } catch (e) {
      console.log('❌ DRM ERROR:', e);
      return undefined;
    }
  };

  // ─── AUTO FALLBACK URL ───────────────────────────────
  const tryNextUrl = () => {
    if (!currentChannel.urls) return;

    const nextIndex = (currentChannel.urlIndex || 0) + 1;

    if (nextIndex < currentChannel.urls.length) {
      console.log('🔁 Try next stream:', nextIndex);
      currentChannel.urlIndex = nextIndex;
      player.setPlayerKey(k => k + 1);
    } else {
      console.log('❌ All stream failed');
    }
  };

  // ─── DEBUG LOG ───────────────────────────────────────
  React.useEffect(() => {
    console.log('🎬 PLAY:', currentUrl);
    console.log('📺 TYPE:', isDash ? 'DASH' : isHls ? 'HLS' : 'OTHER');
    console.log('🔐 DRM:', currentChannel.drm);
  }, [currentUrl]);

  return (
    <View style={styles.container}>

      {/* VIDEO */}
      {currentUrl !== '' && (
        <Video
          key={player.playerKey}
          ref={player.videoRef}
          source={{
            uri: currentUrl,
            headers: Object.keys(player.currentHeaders).length
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
            console.log('⏳ Loading...');
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
            console.log('❌ ERROR:', JSON.stringify(e, null, 2));
            player.setIsVideoLoading(false);
            tryNextUrl();
          }}

          bufferConfig={BUFFER_CONFIG}
        />
      )}

      {/* LOADING */}
      {player.isVideoLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* TAP CONTROL */}
      <TouchableWithoutFeedback onPress={player.toggleControls}>
        <View style={StyleSheet.absoluteFill}>
          {player.showControls && (
            <View style={styles.controls}>

              <View style={styles.top}>
                <Text style={styles.title}>{currentChannel.name}</Text>
                <Image source={{ uri: LOGO_APP }} style={styles.logo} />
              </View>

              <View style={styles.bottom}>
                <TouchableOpacity onPress={() => player.setIsMuted(m => !m)}>
                  <MaterialIcons name={player.isMuted ? 'volume-off' : 'volume-up'} size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity onPress={player.toggleCustomFullscreen}>
                  <MaterialIcons name={player.isFullscreen ? 'fullscreen-exit' : 'fullscreen'} size={26} color="#fff" />
                </TouchableOpacity>
              </View>

            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

    </View>
  );
}

// ─── STYLE ─────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { width: '100%', height: 220 },
  loading: { position: 'absolute', width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' },

  controls: { flex: 1, justifyContent: 'space-between', padding: 15 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: '#fff', fontWeight: 'bold' },
  logo: { width: 80, height: 30 },

  bottom: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 }
});