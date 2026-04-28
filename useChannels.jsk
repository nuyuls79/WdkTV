import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { FALLBACK_CHANNELS } from './config';
import { parseM3U } from './parser';

export const useChannels = () => {
  // ─── STATE LOGCAT ───────────────────────────────────────────────────────────
  const [appLogs, setAppLogs] = useState([]);
  const [showLogcat, setShowLogcat] = useState(false);

  // ─── STATE DATA CHANNEL ─────────────────────────────────────────────────────
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favorites, setFavorites] = useState([]);
  
  // ─── STATE UI & FILTER ──────────────────────────────────────────────────────
  const [categoriesList, setCategoriesList] = useState(['Favorit Saya', 'Semua Kategori']);
  const [activeCategory, setActiveCategory] = useState('Semua Kategori');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── FUNGSI LOGGING ─────────────────────────────────────────────────────────
  const addLog = useCallback((tag, msg) => {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const textMsg = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
    // Batasi maksimal 80 baris log agar memori tidak bocor
    setAppLogs(prev => [...prev, `[${time}] ${tag}: ${textMsg}`].slice(-80));
  }, []);

  const copyLogsToClipboard = async () => {
    if (!appLogs.length) { Alert.alert('Info', 'Logcat masih kosong.'); return; }
    await Clipboard.setStringAsync(appLogs.join('\n'));
    Alert.alert('Sukses', 'Log berhasil disalin!');
  };

  const saveLogsToFile = async () => {
    if (!appLogs.length) { Alert.alert('Info', 'Logcat masih kosong.'); return; }
    const uri = FileSystem.documentDirectory + 'logcat_aditv.txt';
    try {
      await FileSystem.writeAsStringAsync(uri, appLogs.join('\n'), { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Simpan Logcat AdiTV' });
    } catch {
      Alert.alert('Error', 'Gagal menyimpan file log.');
    }
  };

  // ─── FUNGSI FETCH PLAYLIST ──────────────────────────────────────────────────
  const fetchChannels = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    addLog("NET", "Mengunduh playlist...");

    const t = Date.now();
    const URL_ID = `https://raw.githubusercontent.com/amanhnb88/AdiTV/main/streams/id.m3u?t=${t}`;
    const URL_SUPER = `https://raw.githubusercontent.com/amanhnb88/AdiTV/main/streams/playlist_super.m3u?t=${t}`;
    const HEADERS = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };

    try {
      const [resId, resSuper] = await Promise.all([
        fetch(URL_ID, { headers: HEADERS }).catch(() => null),
        fetch(URL_SUPER, { headers: HEADERS }).catch(() => null),
      ]);

      let combined = '';
      if (resId && resId.ok) { combined += await resId.text() + '\n'; addLog("NET", "✅ id.m3u OK"); }
      if (resSuper && resSuper.ok) { combined += await resSuper.text() + '\n'; addLog("NET", "✅ playlist_super.m3u OK"); }

      if (!combined.trim()) throw new Error("Semua playlist gagal diunduh.");

      const { parsedChannels, newCategories } = parseM3U(combined, addLog);
      
      if (parsedChannels.length > 0) {
        setChannels(parsedChannels);
        setCategoriesList(['Favorit Saya', 'Semua Kategori', ...newCategories]);
      } else {
        setChannels(FALLBACK_CHANNELS);
        addLog("WARNING", "Playlist kosong, pakai channel cadangan");
      }
    } catch (err) {
      addLog("ERROR", `Gagal muat playlist: ${err.message}`);
      setChannels(FALLBACK_CHANNELS); // Gunakan fallback jika error total
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ─── FUNGSI FAVORIT ─────────────────────────────────────────────────────────
  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('@favorites_aditv');
      if (saved) setFavorites(JSON.parse(saved));
    } catch (error) {
      addLog("ERROR", "Gagal memuat favorit");
    }
  };

  const toggleFavorite = async (channelId) => {
    try {
      const updated = favorites.includes(channelId)
        ? favorites.filter(id => id !== channelId)
        : [...favorites, channelId];
      setFavorites(updated);
      await AsyncStorage.setItem('@favorites_aditv', JSON.stringify(updated));
    } catch (error) {
      addLog("ERROR", "Gagal menyimpan favorit");
    }
  };

  // ─── LIFECYCLE (Berjalan saat aplikasi pertama kali dibuka) ───────────────
  useEffect(() => {
    fetchChannels();
    loadFavorites();
  }, []);

  // ─── DERIVED DATA (Data yang diolah untuk ditampilkan) ──────────────────────
  let displayedChannels = channels;
  if (activeCategory === 'Favorit Saya') {
    displayedChannels = channels.filter(c => favorites.includes(c.id));
  } else if (activeCategory !== 'Semua Kategori') {
    displayedChannels = channels.filter(c => c.group === activeCategory);
  }
  
  if (searchQuery.trim()) {
    displayedChannels = displayedChannels.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // ─── KEMBALIKAN SEMUA DATA & FUNGSI AGAR BISA DIPAKAI DI APP.JS ───────────
  return {
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
    copyLogsToClipboard,
    saveLogsToFile,
    setShowLogcat,
    setSearchQuery,
    setActiveCategory,
    setAppLogs
  };
};
