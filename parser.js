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

// 3. PENCUCI LOGO
const sanitizeLogo = (raw) => {
  if (!raw || typeof raw !== 'string') return FALLBACK_LOGO;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return FALLBACK_LOGO;
  return trimmed;
};

// 4. PARSER UTAMA
export const parseM3U = (m3uText, addLog = () => {}) => {
  addLog('PARSER', 'Mulai memproses playlist...');

  const lines = m3uText.replace(/\r/g, '').split('\n');
  const parsedChannels = [];
  const tempCategories = new Set();
  const seenIds = new Map();

  let currentInfo = null;

  const flush = () => {
    if (currentInfo && currentInfo.urls.length > 0) {
      parsedChannels.push(currentInfo);
    }
    currentInfo = null;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if (line === '#EXTM3U') continue;
    if (line.startsWith('#http')) continue;
    if (line.startsWith('#EXT-X-') || line.startsWith('##')) continue;

    // ───────────────── DRM TYPE ─────────────────
    if (line.startsWith('#KODIPROP:inputstream.adaptive.license_type=')) {
      if (currentInfo) {
        currentInfo.drmType = line.split('=').pop().trim().toLowerCase();
      }
      continue;
    }

    // ───────────────── DRM KEY ─────────────────
    if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      if (currentInfo) {
        const val = line.split('=').slice(1).join('=').trim();

        try {
          // 🔐 CLEARKEY
          if (currentInfo.drmType === 'clearkey' && val.includes(':')) {
            const [keyId, key] = val.split(':');

            currentInfo.drm = {
              type: 'clearkey',
              keyId: keyId.trim(),
              key: key.trim()
            };
          }

          // 🔐 WIDEVINE
          else {
            const parts = val.split('|');

            currentInfo.drm = {
              type: 'widevine',
              license: parts[0].trim(),
              headers: {}
            };

            if (parts[1]) {
              parts[1].split('&').forEach(h => {
                const [k, v] = h.split('=');
                if (k && v) {
                  currentInfo.drm.headers[k.trim()] = decodeURIComponent(v.trim());
                }
              });
            }
          }
        } catch (e) {
          addLog('ERROR', 'Gagal parsing DRM: ' + e.message);
        }
      }
      continue;
    }

    // ───────────────── HEADERS ─────────────────
    if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
      if (currentInfo) {
        const ref = sanitizeHeaderValue(line.split('=').slice(1).join('='));
        if (ref) {
          currentInfo.headers['Referer'] = ref;
          currentInfo.headers['Origin'] = ref;
        }
      }
      continue;
    }

    if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      if (currentInfo) {
        const ua = sanitizeHeaderValue(line.split('=').slice(1).join('='));
        if (ua) currentInfo.headers['User-Agent'] = ua;
      }
      continue;
    }

    // ───────────────── EXTINF ─────────────────
    if (line.startsWith('#EXTINF:')) {
      flush();

      const idM = line.match(/tvg-id="(.*?)"/);
      const logoM = line.match(/tvg-logo="(.*?)"/);
      const groupM = line.match(/group-title="(.*?)"/);

      const commaIdx = line.lastIndexOf(',');
      let rawName = commaIdx > -1 ? line.substring(commaIdx + 1).trim() : 'Unknown';

      rawName = rawName
        .replace(/\s*\(\d+[pi]\)/gi, '')
        .replace(/\s*\[.*?\]/g, '')
        .trim() || 'Unknown';

      const rawGroup = groupM?.[1] ? groupM[1].split(';')[0].trim() : 'Lain-lain';
      if (rawGroup) tempCategories.add(rawGroup);

      let baseId = idM?.[1] ? idM[1].trim() : '';
      if (!baseId) baseId = `ch_${i}_${rawName.replace(/\W/g, '_')}`;

      const idCount = (seenIds.get(baseId) ?? 0) + 1;
      seenIds.set(baseId, idCount);

      const safeId = idCount === 1 ? baseId : `${baseId}__${idCount}`;

      currentInfo = {
        id: safeId,
        name: rawName,
        logo: sanitizeLogo(logoM?.[1]),
        group: rawGroup,

        urls: [],
        urlIndex: 0,

        headers: {},

        drm: null,
        drmType: null
      };

      continue;
    }

    // ───────────────── URL ─────────────────
    if (line.startsWith('http') && currentInfo) {
      const cleanUrl = sanitizeUrl(line);
      if (!cleanUrl) continue;

      currentInfo.urls.push(cleanUrl);

      if (currentInfo.urls.length === 1) {
        currentInfo.url = cleanUrl;
      }

      continue;
    }
  }

  flush();

  addLog('PARSER', `✅ ${parsedChannels.length} channel berhasil diproses`);
  return {
    parsedChannels,
    newCategories: Array.from(tempCategories)
  };
};