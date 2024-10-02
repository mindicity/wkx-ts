import { BinaryWriter } from "../utils/binarywriter";
import { CONSTANTS } from "../constants/constants";
import { Buffer } from "buffer/index";
import { Point, Geometry } from "../index";

export class LineString extends Geometry {
  points: Point[];
  srid?: number;
  hasZ: boolean = false;
  hasM: boolean = false;

  constructor(points: Point[] = [], srid?: number) {
    super();
    this.points = points;
    this.srid = srid;

    if (this.points.length > 0) {
      this.hasZ = this.points[0].hasZ;
      this.hasM = this.points[0].hasM;
    }
  }

  static Z(points: Point[], srid?: number): LineString {
    const lineString = new LineString(points, srid);
    lineString.hasZ = true;
    return lineString;
  }

  static M(points: Point[], srid?: number): LineString {
    const lineString = new LineString(points, srid);
    lineString.hasM = true;
    return lineString;
  }

  static ZM(points: Point[], srid?: number): LineString {
    const lineString = new LineString(points, srid);
    lineString.hasZ = true;
    lineString.hasM = true;
    return lineString;
  }

  static _parseWktWithOptions(value: any, options: any): LineString {
    const lineString = new LineString();
    lineString.srid = options.srid;
    lineString.hasZ = options.hasZ;
    lineString.hasM = options.hasM;

    if (value.isMatch(["EMPTY"])) {
      return lineString;
    }

    value.expectGroupStart();
    lineString.points.push(...value.matchCoordinates(options));
    value.expectGroupEnd();

    return lineString;
  }

  static _parseWkb(value: any, options: any): LineString {
    const lineString = new LineString();
    lineString.srid = options.srid;
    lineString.hasZ = options.hasZ;
    lineString.hasM = options.hasM;

    const pointCount = value.readUInt32();
    for (let i = 0; i < pointCount; i++) {
      lineString.points.push(Point._readWkbPoint(value, options));
    }

    return lineString;
  }

  static _parseTwkb(value: any, options: any): LineString {
    const lineString = new LineString();
    lineString.hasZ = options.hasZ;
    lineString.hasM = options.hasM;

    if (options.isEmpty) {
      return lineString;
    }

    const previousPoint = new Point(
      0,
      0,
      0 /* options.hasZ ? 0 : undefined*/,
      0 /* options.hasM ? 0 : undefined*/,
    );
    const pointCount = value.readVarInt();

    for (let i = 0; i < pointCount; i++) {
      lineString.points.push(
        Point._readTwkbPoint(value, options, previousPoint),
      );
    }

    return lineString;
  }

  static _parseGeoJSON(value: any): LineString {
    const lineString = new LineString();

    if (value.coordinates.length > 0) {
      lineString.hasZ = value.coordinates[0].length > 2;
    }

    for (const coordinate of value.coordinates) {
      lineString.points.push(Point._readGeoJSONPoint(coordinate));
    }

    return lineString;
  }

  static fromGeometry(geom: Geometry): LineString {
    const lineString = new LineString();
    lineString.srid = geom.srid;
    lineString.hasZ = geom.hasZ;
    lineString.hasM = geom.hasM;

    if (geom instanceof LineString) {
      lineString.points = geom.points;
    } else if (geom instanceof Point) {
      lineString.points = [geom];
    }

    return lineString;
  }

  toWkt(): string {
    if (this.points.length === 0) {
      return this._getWktType(CONSTANTS.wkt.LineString, true);
    }
    return (
      this._getWktType(CONSTANTS.wkt.LineString, false) + this._toInnerWkt()
    );
  }

  _toInnerWkt(): string {
    let innerWkt = "(";
    for (const point of this.points) {
      innerWkt += `${this._getWktCoordinate(point)},`;
    }
    return innerWkt.slice(0, -1) + ")";
  }

  toWkb(parentOptions?: any): Buffer {
    const wkb = new BinaryWriter(this._getWkbSize());

    wkb.writeInt8(1);
    this._writeWkbType(wkb, CONSTANTS.wkb.LineString, parentOptions);
    wkb.writeUInt32LE(this.points.length);

    for (const point of this.points) {
      point._writeWkbPoint(wkb);
    }

    return wkb.buffer;
  }

  toTwkb(): Buffer {
    const twkb = new BinaryWriter(0, true);
    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = this.points.length === 0;

    this._writeTwkbHeader(twkb, CONSTANTS.wkb.LineString, precision, isEmpty);

    if (!isEmpty) {
      twkb.writeVarInt(this.points.length);
      const previousPoint = new Point(0, 0, 0, 0);
      for (const point of this.points) {
        point._writeTwkbPoint(twkb, precision, previousPoint);
      }
    }

    return twkb.buffer;
  }

  public _getWkbSize(): number {
    let coordinateSize = 16;
    if (this.hasZ) {
      coordinateSize += 8;
    }
    if (this.hasM) {
      coordinateSize += 8;
    }
    return 1 + 4 + 4 + this.points.length * coordinateSize;
  }

  toGeoJSON(options?: any): any {
    const geoJSON = super.toGeoJSON(options);
    geoJSON.type = CONSTANTS.geoJSON.LineString;
    geoJSON.coordinates = this.points.map((point) =>
      this.hasZ ? [point.x, point.y, point.z] : [point.x, point.y],
    );

    return geoJSON;
  }
}
