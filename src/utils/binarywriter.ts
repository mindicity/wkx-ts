import { Buffer } from "buffer/index";

export class BinaryWriter {
  public buffer: Buffer;
  private position: number;
  private allowResize: boolean;

  constructor(size: number, allowResize: boolean = true) {
    this.buffer = Buffer.alloc(size); // Usa Buffer.alloc() al posto di Buffer(size) in TypeScript/Node.js moderno
    this.position = 0;
    this.allowResize = allowResize;
  }

  private _write(
    write: Function,
    size: number,
  ): (value: any, noAssert?: boolean) => void {
    return (value: any, noAssert: boolean = false) => {
      this.ensureSize(size);
      write.call(this.buffer, value, this.position, noAssert);
      this.position += size;
    };
  }

  public writeUInt8: (value: number, noAssert?: boolean) => void = this._write(
    Buffer.prototype.writeUInt8,
    1,
  );
  public writeUInt16LE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeUInt16LE, 2);
  public writeUInt16BE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeUInt16BE, 2);
  public writeUInt32LE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeUInt32LE, 4);
  public writeUInt32BE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeUInt32BE, 4);
  public writeInt8: (value: number, noAssert?: boolean) => void = this._write(
    Buffer.prototype.writeInt8,
    1,
  );
  public writeInt16LE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeInt16LE, 2);
  public writeInt16BE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeInt16BE, 2);
  public writeInt32LE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeInt32LE, 4);
  public writeInt32BE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeInt32BE, 4);
  public writeFloatLE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeFloatLE, 4);
  public writeFloatBE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeFloatBE, 4);
  public writeDoubleLE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeDoubleLE, 8);
  public writeDoubleBE: (value: number, noAssert?: boolean) => void =
    this._write(Buffer.prototype.writeDoubleBE, 8);

  public writeBuffer(buffer: Buffer): void {
    this.ensureSize(buffer.length);
    buffer.copy(this.buffer, this.position, 0, buffer.length);
    this.position += buffer.length;
  }

  public writeVarInt(value: number): number {
    let length = 1;

    while ((value & 0xffffff80) !== 0) {
      this.writeUInt8((value & 0x7f) | 0x80);
      value >>>= 7;
      length++;
    }

    this.writeUInt8(value & 0x7f);

    return length;
  }

  private ensureSize(size: number): void {
    if (this.buffer.length < this.position + size) {
      if (this.allowResize) {
        const tempBuffer = Buffer.alloc(this.position + size);
        this.buffer.copy(tempBuffer, 0, 0, this.buffer.length);
        this.buffer = tempBuffer;
      } else {
        throw new RangeError("index out of range");
      }
    }
  }
}
