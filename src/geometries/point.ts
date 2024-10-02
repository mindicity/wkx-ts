import { BinaryWriter } from "../utils/binarywriter";
import { ZigZag } from "../utils/zigzag";
import { CONSTANTS } from "../constants/constants";
import { Buffer } from "buffer/index";
import { Geometry } from "../index";

export class Point extends Geometry {
  x: number;
  y: number;
  z: number;
  m: number;
  srid?: number;
  hasZ: boolean;
  hasM: boolean;

  constructor(x: number, y: number, z: number, m: number, srid?: number) {
    super();
    this.x = x;
    this.y = y;
    this.z = z;
    this.m = m;
    this.srid = srid;

    this.hasZ = typeof this.z !== "undefined";
    this.hasM = typeof this.m !== "undefined";
  }

  static Z(x: number, y: number, z: number, srid?: number): Point {
    const point = new Point(x, y, z, 0 /* was undefined */, srid);
    point.hasZ = true;
    return point;
  }

  static M(x: number, y: number, m: number, srid?: number): Point {
    const point = new Point(x, y, 0 /* was undefined */, m, srid);
    point.hasM = true;
    return point;
  }

  static ZM(x: number, y: number, z: number, m: number, srid?: number): Point {
    const point = new Point(x, y, z, m, srid);
    point.hasZ = true;
    point.hasM = true;
    return point;
  }

  static _parseWktWithOptions(value: any, options: any): Point {
    const point = new Point(0, 0, 0, 0);
    point.srid = options.srid;
    point.hasZ = options.hasZ;
    point.hasM = options.hasM;

    if (value.isMatch(["EMPTY"])) {
      return point;
    }

    value.expectGroupStart();
    const coordinate = value.matchCoordinate(options);

    point.x = coordinate.x;
    point.y = coordinate.y;
    point.z = coordinate.z;
    point.m = coordinate.m;
    value.expectGroupEnd();

    return point;
  }

  static _parseWkb(value: any, options: any): Point {
    const point = Point._readWkbPoint(value, options);
    point.srid = options.srid;
    return point;
  }

  static _readWkbPoint(value: any, options: any): Point {
    return new Point(
      value.readDouble(),
      value.readDouble(),
      options.hasZ ? value.readDouble() : false,
      options.hasM ? value.readDouble() : false,
    );
  }

  static _parseTwkb(value: any, options: any): Point {
    const point = new Point(0, 0, 0, 0);
    point.hasZ = options.hasZ;
    point.hasM = options.hasM;

    if (options.isEmpty) {
      return point;
    }

    point.x = ZigZag.decode(value.readVarInt()) / options.precisionFactor;
    point.y = ZigZag.decode(value.readVarInt()) / options.precisionFactor;
    point.z = options.hasZ
      ? ZigZag.decode(value.readVarInt()) / options.zPrecisionFactor
      : 0;
    point.m = options.hasM
      ? ZigZag.decode(value.readVarInt()) / options.mPrecisionFactor
      : 0;

    return point;
  }

  static _readTwkbPoint(value: any, options: any, previousPoint: Point): Point {
    previousPoint.x! +=
      ZigZag.decode(value.readVarInt()) / options.precisionFactor;
    previousPoint.y! +=
      ZigZag.decode(value.readVarInt()) / options.precisionFactor;

    if (options.hasZ) {
      previousPoint.z! +=
        ZigZag.decode(value.readVarInt()) / options.zPrecisionFactor;
    }
    if (options.hasM) {
      previousPoint.m! +=
        ZigZag.decode(value.readVarInt()) / options.mPrecisionFactor;
    }

    return new Point(
      previousPoint.x,
      previousPoint.y,
      previousPoint.z,
      previousPoint.m,
    );
  }

  static _parseGeoJSON(value: any): Point {
    return Point._readGeoJSONPoint(value.coordinates);
  }

  static _readGeoJSONPoint(coordinates: number[]): Point {
    if (coordinates.length === 0) {
      return new Point(0, 0, 0, 0);
    }
    if (coordinates.length > 2) {
      return new Point(coordinates[0], coordinates[1], coordinates[2], 0);
    }
    return new Point(coordinates[0], coordinates[1], 0, 0);
  }

  static fromGeometry(geom: Geometry): Point {
    const point = new Point(0, 0, 0, 0);
    point.srid = geom.srid;
    point.hasZ = geom.hasZ;
    point.hasM = geom.hasM;

    if (geom instanceof Point) {
      point.x = geom.x;
      point.y = geom.y;
      point.z = geom.z;
      point.m = geom.m;
    } else {
      console.log("Point.fromGeometry: geom is not an instance of Point");
    }

    return point;
  }

  toWkt(): string {
    if (
      this.x === undefined &&
      this.y === undefined &&
      this.z === undefined &&
      this.m === undefined
    ) {
      return this._getWktType(CONSTANTS.wkt.Point, true);
    }
    return `${this._getWktType(CONSTANTS.wkt.Point, false)}(${this._getWktCoordinate(this)})`;
  }

  toWkb(parentOptions?: any): Buffer {
    const wkb = new BinaryWriter(this._getWkbSize());
    wkb.writeInt8(1);
    this._writeWkbType(wkb, CONSTANTS.wkb.Point, parentOptions);

    if (this.x === undefined && this.y === undefined) {
      wkb.writeDoubleLE(NaN);
      wkb.writeDoubleLE(NaN);
      if (this.hasZ) {
        wkb.writeDoubleLE(NaN);
      }
      if (this.hasM) {
        wkb.writeDoubleLE(NaN);
      }
    } else {
      this._writeWkbPoint(wkb);
    }

    return wkb.buffer;
  }

  _writeWkbPoint(wkb: BinaryWriter): void {
    wkb.writeDoubleLE(this.x!);
    wkb.writeDoubleLE(this.y!);
    if (this.hasZ) {
      wkb.writeDoubleLE(this.z!);
    }
    if (this.hasM) {
      wkb.writeDoubleLE(this.m!);
    }
  }

  toTwkb(): Buffer {
    const twkb = new BinaryWriter(0, true);
    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = this.x === undefined && this.y === undefined;

    this._writeTwkbHeader(twkb, CONSTANTS.wkb.Point, precision, isEmpty);

    if (!isEmpty) {
      this._writeTwkbPoint(twkb, precision, new Point(0, 0, 0, 0));
    }

    return twkb.buffer;
  }

  _writeTwkbPoint(
    twkb: BinaryWriter,
    precision: any,
    previousPoint: Point,
  ): void {
    const x = this.x! * precision.xyFactor;
    const y = this.y! * precision.xyFactor;
    const z = this.z! * precision.zFactor;
    const m = this.m! * precision.mFactor;

    twkb.writeVarInt(ZigZag.encode(x - previousPoint.x!));
    twkb.writeVarInt(ZigZag.encode(y - previousPoint.y!));
    if (this.hasZ) {
      twkb.writeVarInt(ZigZag.encode(z - previousPoint.z!));
    }
    if (this.hasM) {
      twkb.writeVarInt(ZigZag.encode(m - previousPoint.m!));
    }

    previousPoint.x = x;
    previousPoint.y = y;
    previousPoint.z = z;
    previousPoint.m = m;
  }

  _getWkbSize(): number {
    let size = 1 + 4 + 8 + 8;
    if (this.hasZ) {
      size += 8;
    }
    if (this.hasM) {
      size += 8;
    }
    return size;
  }

  toGeoJSON(options?: any): any {
    const geoJSON = super.toGeoJSON(options);
    geoJSON.type = CONSTANTS.geoJSON.Point;

    if (this.x === undefined && this.y === undefined) {
      geoJSON.coordinates = [];
    } else if (this.z !== undefined) {
      geoJSON.coordinates = [this.x, this.y, this.z];
    } else {
      geoJSON.coordinates = [this.x, this.y];
    }

    return geoJSON;
  }
}
