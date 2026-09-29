import { open, type FileHandle } from 'node:fs/promises';

// Writes an uncompressed 8-bit RGB BigTIFF strip by strip, so a huge image never has to fit in memory.
// Only used as a temporary step: libvips then turns it into the tiled pyramid.
//   header (16 bytes) → one IFD → strip offsets → strip byte counts → pixel rows
export class RgbTiffWriter {
  private constructor(
    private handle: FileHandle,
    private position: number,
  ) {}

  static async create(file: string, width: number, height: number, rowsPerStrip: number) {
    const strips = Math.ceil(height / rowsPerStrip);
    const entries = 10;
    const ifdSize = 8 + entries * 20 + 8;
    const offsetsAt = 16 + ifdSize;
    const countsAt = offsetsAt + strips * 8;
    const dataAt = countsAt + strips * 8;

    const head = Buffer.alloc(dataAt);
    head.write('II', 0, 'latin1'); // little-endian
    head.writeUInt16LE(43, 2); // BigTIFF
    head.writeUInt16LE(8, 4);
    head.writeBigUInt64LE(16n, 8); // the IFD follows the header

    let at = 16;
    head.writeBigUInt64LE(BigInt(entries), at);
    at += 8;
    const entry = (tag: number, type: number, count: number, write: (offset: number) => void) => {
      head.writeUInt16LE(tag, at);
      head.writeUInt16LE(type, at + 2);
      head.writeBigUInt64LE(BigInt(count), at + 4);
      write(at + 12);
      at += 20;
    };
    const [SHORT, LONG, LONG8] = [3, 4, 16];
    entry(256, LONG, 1, (o) => head.writeUInt32LE(width, o)); // ImageWidth
    entry(257, LONG, 1, (o) => head.writeUInt32LE(height, o)); // ImageLength
    entry(258, SHORT, 3, (o) => [0, 2, 4].forEach((i) => head.writeUInt16LE(8, o + i))); // BitsPerSample 8,8,8
    entry(259, SHORT, 1, (o) => head.writeUInt16LE(1, o)); // no compression
    entry(262, SHORT, 1, (o) => head.writeUInt16LE(2, o)); // RGB
    // One strip: its offset and size fit in the entry itself; more: the entry points to the arrays
    const stripSize = (i: number) => BigInt(Math.min(rowsPerStrip, height - i * rowsPerStrip) * width * 3);
    const stripOffset = (i: number) => BigInt(dataAt + i * rowsPerStrip * width * 3);
    entry(273, LONG8, strips, (o) => head.writeBigUInt64LE(strips === 1 ? stripOffset(0) : BigInt(offsetsAt), o)); // StripOffsets
    entry(277, SHORT, 1, (o) => head.writeUInt16LE(3, o)); // SamplesPerPixel
    entry(278, LONG, 1, (o) => head.writeUInt32LE(rowsPerStrip, o)); // RowsPerStrip
    entry(279, LONG8, strips, (o) => head.writeBigUInt64LE(strips === 1 ? stripSize(0) : BigInt(countsAt), o)); // StripByteCounts
    entry(284, SHORT, 1, (o) => head.writeUInt16LE(1, o)); // chunky pixels
    head.writeBigUInt64LE(0n, at); // no next IFD

    for (let i = 0; i < strips; i++) {
      head.writeBigUInt64LE(stripOffset(i), offsetsAt + i * 8);
      head.writeBigUInt64LE(stripSize(i), countsAt + i * 8);
    }

    const handle = await open(file, 'w');
    await handle.write(head, 0, head.length, 0);
    return new RgbTiffWriter(handle, dataAt);
  }

  // The next rows, RGB interleaved, in order
  async write(rows: Uint8Array) {
    await this.handle.write(rows, 0, rows.length, this.position);
    this.position += rows.length;
  }

  close() {
    return this.handle.close();
  }
}
