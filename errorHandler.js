// ─── errorHandler.js ─────────────────────────────────────────────

export const parseVideoError = (e) => {
  try {
    const err        = e?.error || e;
    const code       = err?.errorCode      || '';
    const stackTrace = err?.errorStackTrace || '';
    const errStr     = err?.errorString     || '';

    // Mencari akar penyebab error dari stack trace ExoPlayer
    const causedByMatch = stackTrace.match(/Caused by:\s*([^\n]+)/);
    const rootCause     = causedByMatch ? causedByMatch[1].trim() : null;

    let category = '';
    let detail   = rootCause || errStr || `code=${code}`;

    // ─── 1. ERROR KONEKSI & JARINGAN ─────────────────────────────────────────
    if (stackTrace.includes('CLEARTEXT') || stackTrace.includes('UnknownServiceException')) {
      const m = stackTrace.match(/CLEARTEXT communication to ([^\s]+) not permitted/);
      category = 'CLEARTEXT';
      detail   = `HTTP diblokir Android (${m ? m[1] : 'host tidak diketahui'}) — server tidak support HTTPS`;
    } else if (stackTrace.includes('SocketTimeoutException') || stackTrace.includes('ConnectTimeoutException')) {
      category = 'TIMEOUT';
      detail   = 'Koneksi ke server timeout — jaringan lambat atau server tidak merespons';
    } else if (stackTrace.includes('UnknownHostException')) {
      const hm = stackTrace.match(/UnknownHostException: ([^\s\n]+)/);
      category = 'DNS';
      detail   = `Domain tidak ditemukan (${hm ? hm[1] : 'unknown host'}) — cek koneksi internet`;
    } else if (stackTrace.includes('SSLHandshakeException') || stackTrace.includes('SSLException')) {
      category = 'SSL';
      detail   = 'Gagal SSL handshake — sertifikat server tidak valid atau expired';
    } 
    
    // ─── 2. ERROR HTTP (DARI SERVER) ─────────────────────────────────────────
    else if (stackTrace.includes('Response code: 403')) {
      category = 'HTTP_403';
      detail   = 'Server menolak akses (403 Forbidden) — URL mungkin butuh auth/token khusus';
    } else if (stackTrace.includes('Response code: 404')) {
      category = 'HTTP_404';
      detail   = 'Stream tidak ditemukan di server (404 Not Found)';
    } else if (stackTrace.includes('Response code: 5')) {
      const cm = stackTrace.match(/Response code: (5\d\d)/);
      category = 'HTTP_5XX';
      detail   = `Server error (${cm ? cm[1] : '5xx'}) — server stream sedang bermasalah`;
    } 
    
    // ─── 3. ERROR FORMAT & DRM (TAMBAHAN BARU) ───────────────────────────────
    else if (stackTrace.includes('UnrecognizedInputFormatException') || stackTrace.includes('ParserException')) {
      category = 'FORMAT_TIDAK_DIKENAL';
      detail   = 'Format stream tidak dikenali — URL mungkin mati atau mengembalikan halaman web (HTML)';
    } else if (stackTrace.includes('DrmSessionException') || stackTrace.includes('KeysExpiredException') || stackTrace.includes('MediaCodecVideoRenderer')) {
      category = 'DRM_ERROR';
      detail   = 'Gagal mendekripsi video — Kunci Lisensi (ClearKey/Widevine) salah atau sudah kedaluwarsa';
    }

    // ─── 4. ERROR PEMUTARAN (EXOPLAYER) ──────────────────────────────────────
    else if (stackTrace.includes('PlaylistStuckException')) {
      category = 'STUCK';
      detail   = 'HLS playlist tidak mengupdate segment baru — stream terhenti di sumbernya';
    } else if (stackTrace.includes('BehindLiveWindowException')) {
      category = 'BEHIND_LIVE';
      detail   = 'Posisi playback tertinggal dari siaran langsung — buffer memori terlalu lama';
    } else if (code === '22001' || errStr.includes('IO_NETWORK')) {
      category = 'IO_NETWORK';
      detail   = rootCause || 'Gagal koneksi jaringan ke server stream';
    } else if (code === '22000' || errStr.includes('IO_UNSPECIFIED')) {
      category = 'IO_UNSPECIFIED';
      detail   = rootCause || 'Error tidak spesifik pada sumber stream';
    } else if (code === '22004' || errStr.includes('BAD_HTTP')) {
      category = 'BAD_HTTP';
      detail   = rootCause || 'Respons HTTP tidak valid dari server';
    } else if (code) {
      category = `EXOPLAYER_${code}`;
      detail   = rootCause || errStr || 'Error tidak dikenal dari pemutar video';
    } else {
      category = 'UNKNOWN';
      detail   = rootCause || errStr || 'Terjadi kesalahan yang tidak diketahui';
    }

    return { category, detail, code };
  } catch (_) {
    return { category: 'PARSE_FAIL', detail: 'Gagal menerjemahkan objek error dari sistem', code: '' };
  }
};
