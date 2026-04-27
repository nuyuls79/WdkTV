import React from 'react';
import { StyleSheet, StatusBar as RNStatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import Custom Hooks (Akan kita buat setelah ini)
import { useChannels } from './useChannels';
import { usePlayer } from './usePlayer';

// Import Komponen UI (Akan kita buat setelah ini)
import PlayerScreen from './PlayerScreen';
import ChannelList from './ChannelList';

// Import Config
import { COLORS } from './config';

export default function App() {
  // 1. Hook untuk mengelola data channel, favorit, dan logcat
  const {
    channels,
    isLoading,
    isRefreshing,
    favorites,
    categoriesList,
    activeCategory,
    searchQuery,
    displayedChannels,
    appLogs,
    showLogcat,
    fetchChannels,
    toggleFavorite,
    addLog,
    setShowLogcat,
    setSearchQuery,
    setActiveCategory,
    setAppLogs
  } = useChannels();

  // 2. Hook untuk mengelola logika player video (DRM, Fullscreen, Fallback)
  // Kita kirim 'channels' dan 'addLog' agar hook player bisa akses data
  const player = usePlayer(channels, addLog);

  return (
    <SafeAreaProvider>
      {/* SafeAreaView menjaga konten agar tidak tertutup notch/kamera punch-hole */}
      <SafeAreaView 
        style={styles.container} 
        edges={player.isFullscreen ? [] : ['top', 'left', 'right', 'bottom']}
      >
        <RNStatusBar 
          hidden={player.isFullscreen} 
          backgroundColor="#121212" 
          barStyle="light-content" 
          translucent 
        />

        {/* BAGIAN ATAS: Video Player & Controls */}
        <PlayerScreen 
          player={player} 
          channels={channels}
        />

        {/* BAGIAN BAWAH: Daftar Channel & Kolom Pencarian */}
        {!player.isFullscreen && (
          <ChannelList 
            channels={channels}
            displayedChannels={displayedChannels}
            activeChannelId={player.activeChannelId}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            favorites={favorites}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            onRefresh={() => fetchChannels(true)}
            onSelectChannel={player.changeChannel}
            onToggleFavorite={toggleFavorite}
            onOpenLogcat={() => setShowLogcat(true)}
            onOpenCategory={() => player.setShowCategoryModal(true)}
            setSearchQuery={setSearchQuery}
          />
        )}

        {/* Modal Logcat & Settings tetap bisa ditaruh di sini atau dipindah ke file terpisah */}
        {/* (Akan kita bahas di langkah selanjutnya) */}

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
