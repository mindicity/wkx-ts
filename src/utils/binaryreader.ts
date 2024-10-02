import { Buffer } from "buffer/index";

export class BinaryReader {
  private buffer: Buffer;
  private position: number;
  public isBigEndian: boolean;

  constructor(buffer: Buffer, isBigEndian: boolean = false) {
    this.buffer = buffer;
    this.position = 0;
    this.isBigEndian = isBigEndian;
  }

  private _read(
    readLE: Function,
    readBE: Function,
    size: number,
  ): () => number {
    return () => {
      let value: number;

      if (this.isBigEndian) {
        value = readBE.call(this.buffer, this.position);
      } else {
        value = readLE.call(this.buffer, this.position);
      }

      this.position += size;
      return value;
    };
  }

  public readUInt8: () => number = this._read(
    Buffer.prototype.readUInt8,
    Buffer.prototype.readUInt8,
    1,
  );
  public readUInt16: () => number = this._read(
    Buffer.prototype.readUInt16LE,
    Buffer.prototype.readUInt16BE,
    2,
  );
  public readUInt32: () => number = this._read(
    Buffer.prototype.readUInt32LE,
    Buffer.prototype.readUInt32BE,
    4,
  );
  public readInt8: () => number = this._read(
    Buffer.prototype.readInt8,
    Buffer.prototype.readInt8,
    1,
  );
  public readInt16: () => number = this._read(
    Buffer.prototype.readInt16LE,
    Buffer.prototype.readInt16BE,
    2,
  );
  public readInt32: () => number = this._read(
    Buffer.prototype.readInt32LE,
    Buffer.prototype.readInt32BE,
    4,
  );
  public readFloat: () => number = this._read(
    Buffer.prototype.readFloatLE,
    Buffer.prototype.readFloatBE,
    4,
  );
  public readDouble: () => number = this._read(
    Buffer.prototype.readDoubleLE,
    Buffer.prototype.readDoubleBE,
    8,
  );

  public readVarInt(): number {
    let nextByte: number;
    let result = 0;
    let bytesRead = 0;

    do {
      nextByte = this.buffer[this.position + bytesRead];
      result += (nextByte & 0x7f) << (7 * bytesRead);
      bytesRead++;
    } while (nextByte >= 0x80);

    this.position += bytesRead;
    return result;
  }
}
