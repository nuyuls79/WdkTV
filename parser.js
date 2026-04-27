// ─── parser.js ───────────────────────────────────────────────────

const FALLBACK_LOGO = 'https://ui-avatars.com/api/?name=TV&background=121212&color=fff';

// 1. PENCUCI URL
export const sanitizeUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  let url = raw.split('|')[0].trim();
  url = url.replace(/\r|\n/g, '');
  url = url.replace(/ /g, '%20');
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;
  return url;
};

// 2. PENCUCI HEADER
const sanitizeHeaderValue = (val) => {
  if (!val) return null;
  const clean = val.replace(/[^\x20-\x7E]/g, '').trim();
  return clean.length > 0 ? clean : null;
};

// 3. PENCUCI LOGO — pastikan selalu string URL yang valid
const sanitizeLogo = (raw) => {
  if (!raw || typeof raw !== 'string') return FALLBACK_LOGO;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return FALLBACK_LOGO;
  return trimmed;
};

// 4. FUNGSI UTAMA PARSER
export const parseM3U = (m3uText, addLog = () => {}) => {
  addLog('PARSER', 'Mulai memproses playlist...');

  const lines          = m3uText.replace(/\r/g, '').split('\n');
  const parsedChannels = [];
  const tempCategories = new Set();
  
  // Penjaga duplicate key — FlatList crash kalau ada tvg-id yang sama
  const seenIds        = new Map();

  let currentInfo    = null;

  // FLUSH — simpan channel aktif ke list jika punya minimal 1 URL
  const flush = () => {
    if (currentInfo && currentInfo.urls.length > 0) {
      parsedChannels.push(currentInfo);
    }
    currentInfo = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // PERBAIKAN 1: Deteksi EXTM3U ganda (Sesuai Audit)
    if (line === '#EXTM3U') {
      if (i > 0) addLog('WARNING', `Ditemukan #EXTM3U duplikat di baris ${i + 1}`);
      continue;
    }

    // PERBAIKAN 2: Lewati eksplisit jika URL berupa komentar
    if (line.startsWith('#http')) {
      addLog('PARSER', 'SKIP URL komentar: ' + line);
      continue;
    }

    if (line.startsWith('#EXT-X-') || line.startsWith('##')) continue;

    // PERBAIKAN 3: Tangani SEMUA #KODIPROP secara eksplisit agar tidak "bocor"
    if (line.startsWith('#KODIPROP:')) {
      if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
        if (currentInfo) {
          const val = line.split('=').slice(1).join('=').trim();
          // Hanya tangkap format statis KID:KEY, abaikan format lain
          if (val.includes(':') && !val.startsWith('{')) {
            currentInfo.licenseKey = val;
          }
        }
      }
      // Abaikan semua baris KODIPROP (baik yang sudah diambil license-nya maupun varian aneh lain)
      continue;
    }

    // ── EXTVLCOPT (Ambil Header HTTP) ──
    if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
      if (currentInfo) {
        const ref = sanitizeHeaderValue(line.substring(line.indexOf('=') + 1));
        if (ref) { 
          currentInfo.headers['Referer'] = ref; 
          currentInfo.headers['Origin'] = ref; 
        }
      }
      continue;
    }
    if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      if (currentInfo) {
        const ua = sanitizeHeaderValue(line.substring(line.indexOf('=') + 1));
        if (ua) currentInfo.headers['User-Agent'] = ua;
      }
      continue;
    }

    // ── #EXTINF (Identitas Channel Baru) ──
    if (line.startsWith('#EXTINF:')) {
      flush(); // Simpan channel sebelumnya (jika ada) sebelum membuat yang baru

      const idM    = line.match(/tvg-id="(.*?)"/);
      const logoM  = line.match(/tvg-logo="(.*?)"/);
      const groupM = line.match(/group-title="(.*?)"/);

      const commaIdx = line.lastIndexOf(',');
      let rawName    = commaIdx > -1 ? line.substring(commaIdx + 1).trim() : 'Unknown';
      rawName        = rawName.replace(/\s*\(\d+[pi]\)/gi, '').replace(/\s*\[.*?\]/g, '').trim() || 'Unknown';

      const rawGroup = groupM?.[1] ? groupM[1].split(';')[0].trim() : 'Lain-lain';
      if (rawGroup) tempCategories.add(rawGroup);

      // Pastikan ID Unik untuk FlatList
      let baseId     = idM?.[1] ? idM[1].trim() : '';
      if (!baseId)    baseId = `ch_${i}_${rawName.replace(/\W/g, '_')}`;
      const idCount  = (seenIds.get(baseId) ?? 0) + 1;
      seenIds.set(baseId, idCount);
      const safeId   = idCount === 1 ? baseId : `${baseId}__${idCount}`;

      currentInfo = {
        id:         safeId,
        name:       rawName,
        logo:       sanitizeLogo(logoM?.[1]), 
        group:      rawGroup,
        urls:       [],  // Simpan SEMUA URL sebagai Array untuk Fallback!
        urlIndex:   0,
        headers:    {},
        licenseKey: null 
      };
      continue;
    }

    // ── URL STREAM ──
    if (line.startsWith('http') && currentInfo) {
      const cleanUrl = sanitizeUrl(line);
      if (!cleanUrl) continue;
      
      // Push setiap URL alternatif ke dalam array urls
      currentInfo.urls.push(cleanUrl);
      
      // Set .url default sebagai URL urutan pertama
      if (currentInfo.urls.length === 1) {
        currentInfo.url = cleanUrl;
      }
      continue;
    }
  }

  flush(); // Jangan lupa simpan channel paling terakhir

  addLog('PARSER', `✅ ${parsedChannels.length} channel berhasil diproses`);
  return { parsedChannels, newCategories: Array.from(tempCategories) };
};
