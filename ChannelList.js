import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  TextInput, FlatList, Image, RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from './config';

export default function ChannelList({
  displayedChannels,
  activeChannelId,
  activeCategory,
  searchQuery,
  favorites,
  isRefreshing,
  onRefresh,
  onSelectChannel,
  onToggleFavorite,
  onOpenLogcat,
  onOpenCategory,
  setSearchQuery
}) {
  // PERBAIKAN UX: Dapatkan insets untuk padding bawah Android Navigation Bar
  const insets = useSafeAreaInsets();

  // ─── RENDER ITEM CHANNEL ──────────────────────────────────────────────────
  const renderChannelItem = ({ item: channel }) => {
    const isActive = activeChannelId === channel.id;
    const isFav = favorites.includes(channel.id);

    return (
      <TouchableOpacity
        style={[styles.channelItem, isActive && styles.activeItem]}
        onPress={() => onSelectChannel(channel)}
      >
        <View style={styles.channelLeft}>
          <View style={styles.logoBox}>
            <Image source={{ uri: channel.logo }} style={styles.logoImg} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cName}>{channel.name}</Text>
            <Text style={styles.cDesc}>{channel.group || 'Siaran Terbaik'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onToggleFavorite(channel.id)} style={{ padding: 5 }}>
          <MaterialIcons
            name={isFav ? 'favorite' : 'favorite-border'}
            size={24}
            color={isFav ? COLORS.accentRed : '#666'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.listSection}>
      
      {/* ── SUPPORT BAR ── */}
      <View style={styles.supportBar}>
        <View>
          <Text style={styles.supportTitle}>SUPPORT</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://saweria.co/michat88')}>
            <Text style={styles.supportSubtitle}>DEVELOPER</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* PERBAIKAN UX: Ganti icon gear jadi bug-report agar tidak membingungkan */}
          <TouchableOpacity style={{ marginRight: 15 }} onPress={onOpenLogcat}>
            <MaterialIcons name="bug-report" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownBtn} onPress={onOpenCategory}>
            <Text style={styles.dropdownText} numberOfLines={1}>{activeCategory}</Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── PENCARIAN ── */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari saluran TV..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ── DAFTAR CHANNEL ── */}
      <FlatList
        data={displayedChannels}
        keyExtractor={item => item.id}
        renderItem={renderChannelItem}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        // PERBAIKAN UX: Tambahkan paddingBottom agar item terakhir tidak tenggelam
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryPurple}
            colors={[COLORS.primaryPurple]}
          />
        }
        ListEmptyComponent={
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 30 }}>
            {activeCategory === 'Favorit Saya' ? 'Belum ada saluran favorit.' : 'Tidak ada saluran ditemukan.'}
          </Text>
        }
      />
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  listSection:     { flex: 1, backgroundColor: COLORS.listBg },
  
  supportBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#3A3A3A', paddingHorizontal: 15, paddingVertical: 12 },
  supportTitle:    { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  supportSubtitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  dropdownBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eeeeee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, maxWidth: 150 },
  dropdownText:    { color: '#000', fontWeight: 'bold', fontSize: 13, flexShrink: 1 },

  searchContainer: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#3A3A3A', borderBottomWidth: 1, borderBottomColor: '#222' },
  searchInput:     { backgroundColor: '#555', color: '#fff', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14 },

  channelItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: '#555' },
  activeItem:      { backgroundColor: '#444' },
  channelLeft:     { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoBox:         { width: 50, height: 35, borderRadius: 6, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
  logoImg:         { width: 45, height: 30 },
  cName:           { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cDesc:           { color: '#aaa', fontSize: 12, fontStyle: 'italic', marginTop: 2 },
});
