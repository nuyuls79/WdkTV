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
  // ─── DERIVED DATA (Mencari Channel Prev & Next) ────────────────────────────
  const currentIndex = channels.findIndex(c => c.id === player.activeChannelId);
  const prevIndex = currentIndex <= 0 ? channels.length - 1 : currentIndex - 1;
  const nextIndex = (currentIndex + 1) % channels.length;
  
  const currentChannelInfo = channels[currentIndex] || FALLBACK_CHANNELS[0];
  const prevChannelInfo = channels[prevIndex] || FALLBACK_CHANNELS[0];
  const nextChannelInfo = channels[nextIndex] || FALLBACK_CHANNELS[0];

  // ─── HELPERS UI ─────────────────────────────────────────────────────────────
  const getResizeModeIcon = () =>
    player.resizeMode === 'contain' ? 'aspect-ratio' : player.resizeMode === 'cover' ? 'crop-free' : 'settings-overscan';

  const renderRadioRow = (label, isSelected, onPress) => (
    <TouchableOpacity style={styles.radioRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.radioTxt}>{label}</Text>
      <MaterialIcons
        name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
        size={26}
        color={isSelected ? COLORS.primaryPurple : '#888'}
      />
    </TouchableOpacity>
  );

  // ─── RENDER PENGATURAN TABS ────────────────────────────────────────────────
  const [settingsTab, setSettingsTab] = React.useState('Video');

  return (
    <View style={player.isFullscreen ? styles.videoContainerFullscreen : styles.videoContainer}>
      
      {/* ── VIDEO COMPONENT ── */}
      {player.currentUrl !== '' && (
        <Video
          key={player.playerKey}
          ref={player.videoRef}
          source={{
            uri: player.currentUrl,
            headers: {
              "User-Agent": "Mozilla/5.0",
              ...player.currentHeaders
            }
          }}
        
          drm={
            player.currentDrm
              ? player.currentDrm.type === 'clearkey'
                ? {
                    type: 'clearkey',
                    clearKeys: {
                      [player.currentDrm.keyId]: player.currentDrm.key
                    }
                  }
                : {
                    type: 'widevine',
                    licenseServer: player.currentDrm.license,
                    headers: {
                      "User-Agent": "Mozilla/5.0",
                      ...player.currentDrm.headers
                    }
                  }
              : undefined
          }
        
          style={styles.video}
          resizeMode={player.resizeMode}
          controls={false}
          muted={player.isMuted}
          paused={player.appState !== 'active'}
        
          onError={(e) => {
            console.log("PLAYER ERROR:", JSON.stringify(e));
            player.setIsVideoLoading(false);
          }}
        />
      )}

      {/* ── LOADING OVERLAY ── */}
      {player.isVideoLoading && (
        <View style={styles.videoLoadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {/* ── KONTROL OVERLAY ── */}
      <TouchableWithoutFeedback onPress={player.toggleControls}>
        <View style={[StyleSheet.absoluteFill, player.showControls && { backgroundColor: COLORS.overlayBg }]}>
          {player.showControls && (
            <View style={styles.controlsWrapper}>
              
              {/* Top Bar */}
              <View style={styles.overlayTop}>
                <Text style={styles.overlayTitle}>{currentChannelInfo.name}</Text>
                <Image source={{ uri: LOGO_APP }} style={styles.overlayBrandImg} resizeMode="contain" />
              </View>

              {/* Center Nav (Hanya di mode Fullscreen) */}
              {player.isFullscreen ? (
                <View style={styles.overlayCenter}>
                  <TouchableOpacity style={styles.floatNavBtn} onPress={() => player.changeChannel(prevChannelInfo)}>
                    <Image source={{ uri: prevChannelInfo.logo }} style={styles.floatNavImg} resizeMode="contain" />
                    <View style={styles.floatNavTextCol}>
                      <Text style={styles.floatNavLabel}>PREV</Text>
                      <Text style={styles.floatNavName} numberOfLines={1}>{prevChannelInfo.name}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.floatNavBtnRight} onPress={() => player.changeChannel(nextChannelInfo)}>
                    <View style={[styles.floatNavTextCol, { alignItems: 'flex-end' }]}>
                      <Text style={styles.floatNavLabel}>NEXT</Text>
                      <Text style={styles.floatNavName} numberOfLines={1}>{nextChannelInfo.name}</Text>
                    </View>
                    <Image source={{ uri: nextChannelInfo.logo }} style={styles.floatNavImgRight} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              ) : <View style={{ flex: 1 }} />}

              {/* Bottom Bar Icons */}
              <View style={styles.overlayBottom}>
                <View style={{ flex: 1 }} />
                <View style={styles.bottomIcons}>
                  {player.isFullscreen && (
                    <TouchableOpacity style={styles.iconHitbox} onPress={player.toggleResizeMode}>
                      <MaterialIcons name={getResizeModeIcon()} size={26} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.iconHitbox} onPress={() => { player.setShowControls(false); player.setShowSettings(true); }}>
                    <MaterialIcons name="tune" size={26} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconHitbox} onPress={() => { player.setIsMuted(m => !m); player.resetHideTimer(); }}>
                    <MaterialIcons name={player.isMuted ? 'volume-off' : 'volume-up'} size={26} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconHitbox} onPress={() => { player.toggleCustomFullscreen(); player.resetHideTimer(); }}>
                    <MaterialIcons name={player.isFullscreen ? 'fullscreen-exit' : 'fullscreen'} size={26} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* ── MODAL: SETTINGS PLAYER ── */}
      <Modal visible={player.showSettings} transparent animationType="fade" onRequestClose={() => player.setShowSettings(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.settingsModal}>
            
            <View style={styles.settingsTabs}>
              {['Video', 'Audio', 'Subtitle'].map(tab => (
                <TouchableOpacity key={tab} style={[styles.tabBtn, settingsTab === tab && styles.tabActive]} onPress={() => setSettingsTab(tab)}>
                  <Text style={[styles.tabTxt, settingsTab === tab && styles.tabTxtActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <ScrollView style={styles.settingsContent} keyboardShouldPersistTaps="handled">
              {settingsTab === 'Video' && (
                <>
                  {renderRadioRow('Kualitas Optimal (Otomatis)', player.selectedVideo.type === 'auto', () => player.setSelectedVideo({ type: 'auto' }))}
                  {player.availableVideoTracks.map(h => renderRadioRow(`${h}p`, player.selectedVideo.value === h, () => player.setSelectedVideo({ type: 'resolution', value: h })))}
                </>
              )}
              {settingsTab === 'Audio' && (
                <>
                  {renderRadioRow('Audio Default (Sistem)', player.selectedAudio.type === 'system', () => player.setSelectedAudio({ type: 'system' }))}
                  {player.availableAudioTracks.map((t, i) => renderRadioRow(t.language || t.title || `Audio ${i + 1}`, player.selectedAudio.value === i, () => player.setSelectedAudio({ type: 'index', value: i })))}
                </>
              )}
              {settingsTab === 'Subtitle' && (
                <>
                  {renderRadioRow('Matikan Subtitle', player.selectedText.type === 'disabled', () => player.setSelectedText({ type: 'disabled' }))}
                  {player.availableTextTracks.map((t, i) => renderRadioRow(t.language || t.title || `Subtitle ${i + 1}`, player.selectedText.value === i, () => player.setSelectedText({ type: 'index', value: i })))}
                </>
              )}
            </ScrollView>

            <View style={styles.settingsFooter}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.okBtn} onPress={() => player.setShowSettings(false)}>
                <Text style={styles.okBtnTxt}>TUTUP</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  videoContainer:           { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoContainerFullscreen: { flex: 1, width: '100%', height: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  video:                    { width: '100%', height: '100%', position: 'absolute' },
  videoLoadingOverlay:      { position: 'absolute', justifyContent: 'center', alignItems: 'center' },

  controlsWrapper: { flex: 1, justifyContent: 'space-between', padding: 15 },
  overlayTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  overlayTitle:    { color: '#fff', fontSize: 16, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  overlayBrandImg: { width: 100, height: 40 },
  overlayCenter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  floatNavBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(50,50,50,0.8)', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#666', width: 140 },
  floatNavBtnRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(50,50,50,0.8)', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#666', width: 140, justifyContent: 'flex-end' },
  floatNavImg:      { width: 35, height: 25, borderRadius: 4, marginRight: 8, backgroundColor: '#fff' },
  floatNavImgRight: { width: 35, height: 25, borderRadius: 4, marginLeft: 8, backgroundColor: '#fff' },
  floatNavTextCol:  { flex: 1 },
  floatNavLabel:    { color: '#fff', fontSize: 11, fontWeight: 'bold', opacity: 0.8 },
  floatNavName:     { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  overlayBottom:    { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' },
  bottomIcons:      { flexDirection: 'row', alignItems: 'center' },
  iconHitbox:       { marginLeft: 25, padding: 5 },

  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  settingsModal:  { backgroundColor: '#4A4A4A', width: '100%', height: '60%', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  settingsTabs:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#666', backgroundColor: '#333', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  tabBtn:         { flex: 1, paddingVertical: 15, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 3, borderBottomColor: COLORS.primaryPurple },
  tabTxt:         { color: '#aaa', fontWeight: 'bold', fontSize: 14 },
  tabTxtActive:   { color: COLORS.primaryPurple },
  settingsContent:{ flex: 1, padding: 20 },
  radioRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  radioTxt:       { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  settingsFooter: { flexDirection: 'row', padding: 15, alignItems: 'center', backgroundColor: '#4A4A4A' },
  okBtn:          { backgroundColor: '#eeeeee', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 25 },
  okBtnTxt:       { color: '#333', fontWeight: 'bold', fontSize: 14 },
});
