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

  // ─── SAFE DRM BUILDER (ANTI CRASH) ─────────────────────────────
  const buildDrm = () => {
    const ch = player.currentChannel;
    if (!ch || !ch.drm) return undefined;

    try {
      const drm = ch.drm;

      // CLEARKEY
      if (drm.type === 'clearkey' && drm.keyId && drm.key) {
        return {
          type: 'clearkey',
          clearKeys: {
            [drm.keyId]: drm.key
          }
        };
      }

      // WIDEVINE
      if (drm.type === 'widevine' && drm.license) {
        return {
          type: 'widevine',
          licenseServer: drm.license,
          headers: drm.headers || {}
        };
      }

      return undefined;
    } catch (e) {
      console.log('❌ DRM BUILD ERROR:', e);
      return undefined;
    }
  };

  // ─── FALLBACK URL (ANTI DEAD STREAM) ───────────────────────────
  const getCurrentUrl = () => {
    const ch = player.currentChannel;
    if (!ch || !ch.urls || ch.urls.length === 0) return '';

    return ch.urls[ch.urlIndex || 0];
  };

  // ─── AUTO RETRY NEXT URL ───────────────────────────────────────
  const tryNextUrl = () => {
    const ch = player.currentChannel;
    if (!ch || !ch.urls) return;

    const nextIndex = (ch.urlIndex || 0) + 1;

    if (nextIndex < ch.urls.length) {
      console.log('🔁 TRY NEXT URL:', nextIndex);

      ch.urlIndex = nextIndex;
      player.setPlayerKey(k => k + 1);
    } else {
      console.log('❌ ALL URL FAILED');
    }
  };

  // ─── DERIVED DATA ─────────────────────────────────────────────
  const currentIndex = channels.findIndex(c => c.id === player.activeChannelId);
  const prevIndex = currentIndex <= 0 ? channels.length - 1 : currentIndex - 1;
  const nextIndex = (currentIndex + 1) % channels.length;

  const currentChannelInfo = channels[currentIndex] || FALLBACK_CHANNELS[0];
  const prevChannelInfo = channels[prevIndex] || FALLBACK_CHANNELS[0];
  const nextChannelInfo = channels[nextIndex] || FALLBACK_CHANNELS[0];

  const [settingsTab, setSettingsTab] = React.useState('Video');

  return (
    <View style={player.isFullscreen ? styles.videoContainerFullscreen : styles.videoContainer}>

      {/* ─── VIDEO PLAYER ─── */}
      {getCurrentUrl() !== '' && (
        <Video
          key={player.playerKey}
          ref={player.videoRef}
          source={{
            uri: getCurrentUrl(),
            headers: Object.keys(player.currentHeaders).length
              ? player.currentHeaders
              : undefined,
          }}
          drm={buildDrm()}
          style={styles.video}
          resizeMode={player.resizeMode}
          controls={false}
          muted={player.isMuted}
          paused={player.appState !== 'active'}

          onLoadStart={() => player.setIsVideoLoading(true)}

          onLoad={() => {
            player.setIsVideoLoading(false);
          }}

          onBuffer={({ isBuffering }) => {
            player.setIsVideoLoading(isBuffering);
          }}

          onError={(e) => {
            console.log('❌ VIDEO ERROR:', e);

            player.setIsVideoLoading(false);

            // 🔥 AUTO FALLBACK
            tryNextUrl();
          }}

          bufferConfig={BUFFER_CONFIG}
        />
      )}

      {/* ─── LOADING ─── */}
      {player.isVideoLoading && (
        <View style={styles.videoLoadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {/* ─── CONTROLS ─── */}
      <TouchableWithoutFeedback onPress={player.toggleControls}>
        <View style={[StyleSheet.absoluteFill, player.showControls && { backgroundColor: COLORS.overlayBg }]}>

          {player.showControls && (
            <View style={styles.controlsWrapper}>

              {/* TOP */}
              <View style={styles.overlayTop}>
                <Text style={styles.overlayTitle}>{currentChannelInfo.name}</Text>
                <Image source={{ uri: LOGO_APP }} style={styles.overlayBrandImg} />
              </View>

              {/* CENTER NAV */}
              {player.isFullscreen && (
                <View style={styles.overlayCenter}>
                  <TouchableOpacity onPress={() => player.changeChannel(prevChannelInfo)}>
                    <Text style={{ color: '#fff' }}>PREV</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => player.changeChannel(nextChannelInfo)}>
                    <Text style={{ color: '#fff' }}>NEXT</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* BOTTOM */}
              <View style={styles.overlayBottom}>
                <TouchableOpacity onPress={() => player.setShowSettings(true)}>
                  <MaterialIcons name="tune" size={26} color="#fff" />
                </TouchableOpacity>

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

      {/* ─── SETTINGS MODAL ─── */}
      <Modal visible={player.showSettings} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.settingsModal}>

            <View style={styles.settingsTabs}>
              {['Video', 'Audio', 'Subtitle'].map(tab => (
                <TouchableOpacity key={tab} onPress={() => setSettingsTab(tab)}>
                  <Text style={{ color: '#fff', margin: 10 }}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={{ color: '#fff' }}>Settings</Text>
            </ScrollView>

            <TouchableOpacity onPress={() => player.setShowSettings(false)}>
              <Text style={{ color: '#fff', textAlign: 'center', padding: 15 }}>TUTUP</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── STYLE ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  videoContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  videoContainerFullscreen: { flex: 1, backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  videoLoadingOverlay: { position: 'absolute', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },

  controlsWrapper: { flex: 1, justifyContent: 'space-between', padding: 15 },
  overlayTop: { flexDirection: 'row', justifyContent: 'space-between' },
  overlayTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  overlayBrandImg: { width: 100, height: 40 },

  overlayCenter: { flexDirection: 'row', justifyContent: 'space-between' },
  overlayBottom: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  settingsModal: { backgroundColor: '#333', height: '60%' },
  settingsTabs: { flexDirection: 'row', justifyContent: 'space-around' }
});