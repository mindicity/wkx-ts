import { BinaryWriter } from "../utils/binarywriter";
import { CONSTANTS } from "../constants/constants";
import { Buffer } from "buffer/index";
import { Point, Geometry, LineString } from "../index";

export class MultiLineString extends Geometry {
  lineStrings: LineString[];
  srid?: number;

  constructor(lineStrings: LineString[] = [], srid?: number) {
    super();
    this.lineStrings = lineStrings;
    this.srid = srid;

    if (this.lineStrings.length > 0) {
      this.hasZ = this.lineStrings[0].hasZ;
      this.hasM = this.lineStrings[0].hasM;
    }
  }

  static Z(lineStrings: LineString[], srid?: number): MultiLineString {
    const multiLineString = new MultiLineString(lineStrings, srid);
    multiLineString.hasZ = true;
    return multiLineString;
  }

  static M(lineStrings: LineString[], srid?: number): MultiLineString {
    const multiLineString = new MultiLineString(lineStrings, srid);
    multiLineString.hasM = true;
    return multiLineString;
  }

  static ZM(lineStrings: LineString[], srid?: number): MultiLineString {
    const multiLineString = new MultiLineString(lineStrings, srid);
    multiLineString.hasZ = true;
    multiLineString.hasM = true;
    return multiLineString;
  }

  static _parseWktWithOptions(value: any, options: any): MultiLineString {
    const multiLineString = new MultiLineString();
    multiLineString.srid = options.srid;
    multiLineString.hasZ = options.hasZ;
    multiLineString.hasM = options.hasM;

    if (value.isMatch(["EMPTY"])) {
      return multiLineString;
    }

    value.expectGroupStart();
    do {
      value.expectGroupStart();
      multiLineString.lineStrings.push(
        new LineString(value.matchCoordinates(options)),
      );
      value.expectGroupEnd();
    } while (value.isMatch([","]));
    value.expectGroupEnd();

    return multiLineString;
  }

  static _parseWkb(value: any, options: any): MultiLineString {
    const multiLineString = new MultiLineString();
    multiLineString.srid = options.srid;
    multiLineString.hasZ = options.hasZ;
    multiLineString.hasM = options.hasM;

    const lineStringCount = value.readUInt32();
    for (let i = 0; i < lineStringCount; i++) {
      const parsedGeometry = Geometry.parse(value, options);
      multiLineString.lineStrings.push(LineString.fromGeometry(parsedGeometry));
    }

    return multiLineString;
  }

  static _parseTwkb(value: any, options: any): MultiLineString {
    const multiLineString = new MultiLineString();
    multiLineString.hasZ = options.hasZ;
    multiLineString.hasM = options.hasM;

    if (options.isEmpty) {
      return multiLineString;
    }

    const previousPoint = new Point(
      0,
      0,
      0 /* options.hasZ ? 0 : undefined*/,
      0 /* options.hasM ? 0 : undefined*/,
    );
    const lineStringCount = value.readVarInt();
    for (let i = 0; i < lineStringCount; i++) {
      const lineString = new LineString();
      lineString.hasZ = options.hasZ;
      lineString.hasM = options.hasM;

      const pointCount = value.readVarInt();
      for (let j = 0; j < pointCount; j++) {
        lineString.points.push(
          Point._readTwkbPoint(value, options, previousPoint),
        );
      }
      multiLineString.lineStrings.push(lineString);
    }

    return multiLineString;
  }

  static _parseGeoJSON(value: any): MultiLineString {
    const multiLineString = new MultiLineString();

    if (value.coordinates.length > 0 && value.coordinates[0].length > 0) {
      multiLineString.hasZ = value.coordinates[0][0].length > 2;
    }

    for (let i = 0; i < value.coordinates.length; i++) {
      multiLineString.lineStrings.push(
        LineString._parseGeoJSON({ coordinates: value.coordinates[i] }),
      );
    }

    return multiLineString;
  }

  toWkt(): string {
    if (this.lineStrings.length === 0) {
      return this._getWktType(CONSTANTS.wkt.MultiLineString, true);
    }

    let wkt = this._getWktType(CONSTANTS.wkt.MultiLineString, false) + "(";
    for (let i = 0; i < this.lineStrings.length; i++) {
      wkt += this.lineStrings[i]._toInnerWkt() + ",";
    }
    wkt = wkt.slice(0, -1) + ")";

    return wkt;
  }

  toWkb(): Buffer {
    const wkb = new BinaryWriter(this._getWkbSize());
    wkb.writeInt8(1);

    this._writeWkbType(wkb, CONSTANTS.wkb.MultiLineString);
    wkb.writeUInt32LE(this.lineStrings.length);

    for (let i = 0; i < this.lineStrings.length; i++) {
      wkb.writeBuffer(this.lineStrings[i].toWkb({ srid: this.srid }));
    }

    return wkb.buffer;
  }

  toTwkb(): Buffer {
    const twkb = new BinaryWriter(0, true);
    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = this.lineStrings.length === 0;

    this._writeTwkbHeader(
      twkb,
      CONSTANTS.wkb.MultiLineString,
      precision,
      isEmpty,
    );

    if (!isEmpty) {
      twkb.writeVarInt(this.lineStrings.length);
      const previousPoint = new Point(0, 0, 0, 0);
      for (let i = 0; i < this.lineStrings.length; i++) {
        twkb.writeVarInt(this.lineStrings[i].points.length);
        for (let j = 0; j < this.lineStrings[i].points.length; j++) {
          this.lineStrings[i].points[j]._writeTwkbPoint(
            twkb,
            precision,
            previousPoint,
          );
        }
      }
    }

    return twkb.buffer;
  }

  _getWkbSize(): number {
    let size = 1 + 4 + 4;
    for (let i = 0; i < this.lineStrings.length; i++) {
      size += this.lineStrings[i]._getWkbSize();
    }

    return size;
  }

  toGeoJSON(options: any): any {
    const geoJSON = super.toGeoJSON(options);
    geoJSON.type = CONSTANTS.geoJSON.MultiLineString;
    geoJSON.coordinates = [];

    for (let i = 0; i < this.lineStrings.length; i++) {
      geoJSON.coordinates.push(this.lineStrings[i].toGeoJSON().coordinates);
    }

    return geoJSON;
  }
}
