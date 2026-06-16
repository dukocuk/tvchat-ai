const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateToken(length) {
  var len = length || 8;
  var result = '';

  // Use crypto if available (Chromium 48+); fall back to Math.random for M47
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    var bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    for (var i = 0; i < len; i++) {
      result += CHARS[bytes[i] % CHARS.length];
    }
  } else {
    for (var j = 0; j < len; j++) {
      result += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
  }

  return result;
}
