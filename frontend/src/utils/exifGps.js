/**
 * Reads the GPS position a phone camera writes into a JPEG's EXIF block.
 * Returns { latitude, longitude } or null when the photo carries no location
 * (PNG/WEBP, screenshots, or apps that strip metadata).
 * No dependency: it walks the APP1 → TIFF → GPS IFD structure directly.
 */
export async function readExifGps(file) {
  if (!file || !/jpe?g/i.test(file.type)) return null;
  try {
    // EXIF lives in the first segment; 256 KB is plenty.
    const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset);
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
        return parseTiff(view, offset + 10);
      }
      if ((marker & 0xff00) !== 0xff00) break;
      offset += 2 + size;
    }
  } catch {
    /* unreadable file: treat as no location */
  }
  return null;
}

function parseTiff(view, start) {
  const little = view.getUint16(start) === 0x4949;
  const u16 = (o) => view.getUint16(start + o, little);
  const u32 = (o) => view.getUint32(start + o, little);

  const findTag = (ifd, tag) => {
    const count = u16(ifd);
    for (let i = 0; i < count; i += 1) {
      const entry = ifd + 2 + i * 12;
      if (u16(entry) === tag) return entry;
    }
    return null;
  };

  const gpsPointer = findTag(u32(4), 0x8825);
  if (gpsPointer === null) return null;
  const gps = u32(gpsPointer + 8);

  const ref = (tag) => {
    const e = findTag(gps, tag);
    return e === null ? null : String.fromCharCode(view.getUint8(start + e + 8));
  };
  const dms = (tag) => {
    const e = findTag(gps, tag);
    if (e === null) return null;
    const at = u32(e + 8);
    const part = (i) => u32(at + i * 8) / (u32(at + i * 8 + 4) || 1);
    return part(0) + part(1) / 60 + part(2) / 3600;
  };

  const lat = dms(0x0002);
  const lng = dms(0x0004);
  if (lat === null || lng === null || (lat === 0 && lng === 0)) return null;
  return {
    latitude: ref(0x0001) === 'S' ? -lat : lat,
    longitude: ref(0x0003) === 'W' ? -lng : lng,
  };
}
