export class ZigZag {
  public static encode(value: number): number {
    return (value << 1) ^ (value >> 31);
  }

  public static decode(value: number): number {
    return (value >> 1) ^ -(value & 1);
  }
}
