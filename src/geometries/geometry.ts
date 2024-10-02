import { Buffer } from "buffer/index";
import {
  Point,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Polygon,
  ZigZag,
  BinaryReader,
  BinaryWriter,
  WktParser,
  CONSTANTS,
} from "../index";

export class Geometry {
  srid?: number;
  hasZ: boolean;
  hasM: boolean;

  constructor() {
    this.srid = undefined;
    this.hasZ = false;
    this.hasM = false;
  }

  static parse(
    value: string | Buffer | WktParser | BinaryReader,
    options?: any,
  ): Geometry {
    const valueType = typeof value;

    if (valueType === "string" || value instanceof WktParser) {
      return Geometry._parseWkt(value as string | WktParser);
    } else if (Buffer.isBuffer(value) || value instanceof BinaryReader) {
      try {
        return Geometry._parseWkb(value, options);
      } catch (e) {
        try {
          return Geometry.parseTwkb(value);
        } catch (e) {
          throw new Error("Could not parse WKB or TWKB");
        }
      }
    } else {
      throw new Error("First argument must be a string or Buffer");
    }
  }

  static _parseWkt(value: string | WktParser): Geometry {
    let wktParser: WktParser;
    let srid: number | undefined;

    if (value instanceof WktParser) {
      wktParser = value;
    } else {
      wktParser = new WktParser(value);
    }

    const match = wktParser.matchRegex([/^SRID=(\d+);/]);
    if (match) {
      srid = parseInt(match[1], 10);
    }

    const geometryType = wktParser.matchType();
    const dimension = wktParser.matchDimension();

    const options = {
      srid,
      hasZ: dimension.hasZ,
      hasM: dimension.hasM,
    };

    switch (geometryType) {
      case CONSTANTS.wkt.Point:
        return Point._parseWktWithOptions(wktParser, options);
      case CONSTANTS.wkt.LineString:
        return LineString._parseWktWithOptions(wktParser, options);
      case CONSTANTS.wkt.Polygon:
        return Polygon._parseWktWithOptions(wktParser, options);
      case CONSTANTS.wkt.MultiPoint:
        return MultiPoint._parseWktWithOptions(wktParser, options);
      case CONSTANTS.wkt.MultiLineString:
        return MultiLineString._parseWktWithOptions(wktParser, options);
      case CONSTANTS.wkt.MultiPolygon:
        return MultiPolygon._parseWktWithOptions(wktParser, options);
      case CONSTANTS.wkt.GeometryCollection:
        return GeometryCollection._parseWktWithOptions(wktParser, options);
      default:
        throw new Error("Unsupported geometry type");
    }
  }

  static _parseWkb(
    value: Buffer | BinaryReader,
    parentOptions?: any,
  ): Geometry {
    let binaryReader: BinaryReader;
    let wkbType: number;
    let geometryType: number;
    const options: any = {};

    if (value instanceof BinaryReader) {
      binaryReader = value;
    } else {
      binaryReader = new BinaryReader(value);
    }

    binaryReader.isBigEndian = !binaryReader.readInt8();
    wkbType = binaryReader.readUInt32();

    options.hasSrid = (wkbType & 0x20000000) === 0x20000000;
    options.isEwkb =
      wkbType & 0x20000000 || wkbType & 0x40000000 || wkbType & 0x80000000;

    if (options.hasSrid) {
      options.srid = binaryReader.readUInt32();
    }

    options.hasZ = false;
    options.hasM = false;

    if (!options.isEwkb && (!parentOptions || !parentOptions.isEwkb)) {
      if (wkbType >= 1000 && wkbType < 2000) {
        options.hasZ = true;
        geometryType = wkbType - 1000;
      } else if (wkbType >= 2000 && wkbType < 3000) {
        options.hasM = true;
        geometryType = wkbType - 2000;
      } else if (wkbType >= 3000 && wkbType < 4000) {
        options.hasZ = true;
        options.hasM = true;
        geometryType = wkbType - 3000;
      } else {
        geometryType = wkbType;
      }
    } else {
      if (wkbType & 0x80000000) {
        options.hasZ = true;
      }
      if (wkbType & 0x40000000) {
        options.hasM = true;
      }

      geometryType = wkbType & 0xf;
    }

    switch (geometryType) {
      case CONSTANTS.wkb.Point:
        return Point._parseWkb(binaryReader, options);
      case CONSTANTS.wkb.LineString:
        return LineString._parseWkb(binaryReader, options);
      case CONSTANTS.wkb.Polygon:
        return Polygon._parseWkb(binaryReader, options);
      case CONSTANTS.wkb.MultiPoint:
        return MultiPoint._parseWkb(binaryReader, options);
      case CONSTANTS.wkb.MultiLineString:
        return MultiLineString._parseWkb(binaryReader, options);
      case CONSTANTS.wkb.MultiPolygon:
        return MultiPolygon._parseWkb(binaryReader, options);
      case CONSTANTS.wkb.GeometryCollection:
        return GeometryCollection._parseWkb(binaryReader, options);
      default:
        throw new Error(`GeometryType ${geometryType} not supported`);
    }
  }

  static parseTwkb(value: Buffer | BinaryReader): Geometry {
    let binaryReader: BinaryReader;
    const options: any = {};

    if (value instanceof BinaryReader) {
      binaryReader = value;
    } else {
      binaryReader = new BinaryReader(value);
    }

    const type = binaryReader.readUInt8();
    const metadataHeader = binaryReader.readUInt8();

    const geometryType = type & 0x0f;
    options.precision = ZigZag.decode(type >> 4);
    options.precisionFactor = Math.pow(10, options.precision);

    options.hasBoundingBox = (metadataHeader >> 0) & 1;
    options.hasSizeAttribute = (metadataHeader >> 1) & 1;
    options.hasIdList = (metadataHeader >> 2) & 1;
    options.hasExtendedPrecision = (metadataHeader >> 3) & 1;
    options.isEmpty = (metadataHeader >> 4) & 1;

    if (options.hasExtendedPrecision) {
      const extendedPrecision = binaryReader.readUInt8();
      options.hasZ = (extendedPrecision & 0x01) === 0x01;
      options.hasM = (extendedPrecision & 0x02) === 0x02;

      options.zPrecision = ZigZag.decode((extendedPrecision & 0x1c) >> 2);
      options.zPrecisionFactor = Math.pow(10, options.zPrecision);

      options.mPrecision = ZigZag.decode((extendedPrecision & 0xe0) >> 5);
      options.mPrecisionFactor = Math.pow(10, options.mPrecision);
    } else {
      options.hasZ = false;
      options.hasM = false;
    }

    if (options.hasSizeAttribute) {
      binaryReader.readVarInt();
    }
    if (options.hasBoundingBox) {
      let dimensions = 2;

      if (options.hasZ) {
        dimensions++;
      }
      if (options.hasM) {
        dimensions++;
      }

      for (let i = 0; i < dimensions; i++) {
        binaryReader.readVarInt();
        binaryReader.readVarInt();
      }
    }

    switch (geometryType) {
      case CONSTANTS.wkb.Point:
        return Point._parseTwkb(binaryReader, options);
      case CONSTANTS.wkb.LineString:
        return LineString._parseTwkb(binaryReader, options);
      case CONSTANTS.wkb.Polygon:
        return Polygon._parseTwkb(binaryReader, options);
      case CONSTANTS.wkb.MultiPoint:
        return MultiPoint._parseTwkb(binaryReader, options);
      case CONSTANTS.wkb.MultiLineString:
        return MultiLineString._parseTwkb(binaryReader, options);
      case CONSTANTS.wkb.MultiPolygon:
        return MultiPolygon._parseTwkb(binaryReader, options);
      case CONSTANTS.wkb.GeometryCollection:
        return GeometryCollection._parseTwkb(binaryReader, options);
      default:
        throw new Error("GeometryType " + geometryType + " not supported");
    }
  }

  toGeoJSON(options?: { shortCrs?: boolean; longCrs?: boolean }): any {
    const geoJSON: any = {};

    if (this.srid) {
      if (options) {
        if (options.shortCrs) {
          geoJSON.crs = {
            type: "name",
            properties: {
              name: "EPSG:" + this.srid,
            },
          };
        } else if (options.longCrs) {
          geoJSON.crs = {
            type: "name",
            properties: {
              name: "urn:ogc:def:crs:EPSG::" + this.srid,
            },
          };
        }
      }
    }

    return geoJSON;
  }

  static _parseGeoJSON(value: any, isSubGeometry?: boolean): Geometry {
    let geometry: Geometry;

    switch (value.type) {
      case CONSTANTS.geoJSON.Point:
        geometry = Point._parseGeoJSON(value);
        break;
      case CONSTANTS.geoJSON.LineString:
        geometry = LineString._parseGeoJSON(value);
        break;
      case CONSTANTS.geoJSON.Polygon:
        geometry = Polygon._parseGeoJSON(value);
        break;
      case CONSTANTS.geoJSON.MultiPoint:
        geometry = MultiPoint._parseGeoJSON(value);
        break;
      case CONSTANTS.geoJSON.MultiLineString:
        geometry = MultiLineString._parseGeoJSON(value);
        break;
      case CONSTANTS.geoJSON.MultiPolygon:
        geometry = MultiPolygon._parseGeoJSON(value);
        break;
      case CONSTANTS.geoJSON.GeometryCollection:
        geometry = GeometryCollection._parseGeoJSON(value);
        break;
      default:
        throw new Error("GeometryType " + value.type + " not supported");
    }

    if (
      value.crs &&
      value.crs.type &&
      value.crs.type === "name" &&
      value.crs.properties &&
      value.crs.properties.name
    ) {
      const crs = value.crs.properties.name;

      if (crs.indexOf("EPSG:") === 0) {
        geometry.srid = parseInt(crs.substring(5));
      } else if (crs.indexOf("urn:ogc:def:crs:EPSG::") === 0) {
        geometry.srid = parseInt(crs.substring(22));
      } else {
        throw new Error("Unsupported crs: " + crs);
      }
    } else if (!isSubGeometry) {
      geometry.srid = 4326;
    }

    return geometry;
  }

  toEwkt(): string {
    return `SRID=${this.srid};${this.toWkt()}`;
  }

  toEwkb(): Buffer {
    const ewkb = new BinaryWriter(this._getWkbSize() + 4);
    const wkb = this.toWkb();

    ewkb.writeInt8(1);
    ewkb.writeUInt32LE(
      (wkb.slice(1, 5).readUInt32LE(0) | 0x20000000) >>> 0,
      true,
    );
    ewkb.writeUInt32LE(this.srid!);

    ewkb.writeBuffer(wkb.slice(5));

    return ewkb.buffer;
  }

  _getWktType(wktType: string, isEmpty: boolean): string {
    let wkt = wktType;

    if (this.hasZ && this.hasM) {
      wkt += " ZM ";
    } else if (this.hasZ) {
      wkt += " Z ";
    } else if (this.hasM) {
      wkt += " M ";
    }

    if (isEmpty && !this.hasZ && !this.hasM) {
      wkt += " ";
    }

    if (isEmpty) {
      wkt += "EMPTY";
    }

    return wkt;
  }

  _getWktCoordinate(point: any): string {
    let coordinates = `${point.x} ${point.y}`;

    if (this.hasZ) {
      coordinates += ` ${point.z}`;
    }
    if (this.hasM) {
      coordinates += ` ${point.m}`;
    }

    return coordinates;
  }

  _writeWkbType(
    wkb: BinaryWriter,
    geometryType: number,
    parentOptions?: any,
  ): void {
    let dimensionType = 0;

    if (
      typeof this.srid === "undefined" &&
      (!parentOptions || typeof parentOptions.srid === "undefined")
    ) {
      if (this.hasZ && this.hasM) {
        dimensionType += 3000;
      } else if (this.hasZ) {
        dimensionType += 1000;
      } else if (this.hasM) {
        dimensionType += 2000;
      }
    } else {
      if (this.hasZ) {
        dimensionType |= 0x80000000;
      }
      if (this.hasM) {
        dimensionType |= 0x40000000;
      }
    }

    wkb.writeUInt32LE((dimensionType + geometryType) >>> 0, true);
  }

  static getTwkbPrecision(
    xyPrecision: number,
    zPrecision: number,
    mPrecision: number,
  ) {
    return {
      xy: xyPrecision,
      z: zPrecision,
      m: mPrecision,
      xyFactor: Math.pow(10, xyPrecision),
      zFactor: Math.pow(10, zPrecision),
      mFactor: Math.pow(10, mPrecision),
    };
  }

  _writeTwkbHeader(
    twkb: BinaryWriter,
    geometryType: number,
    precision: any,
    isEmpty: boolean,
  ): void {
    const type = (ZigZag.encode(precision.xy) << 4) + geometryType;
    let metadataHeader = this.hasZ || this.hasM ? 1 : 0 << 3;
    metadataHeader += isEmpty ? 1 : 0 << 4;

    twkb.writeUInt8(type);
    twkb.writeUInt8(metadataHeader);

    if (this.hasZ || this.hasM) {
      let extendedPrecision = 0;
      if (this.hasZ) {
        extendedPrecision |= 0x1;
      }
      if (this.hasM) {
        extendedPrecision |= 0x2;
      }

      twkb.writeUInt8(extendedPrecision);
    }
  }

  toWkt(): string {
    throw new Error("Method 'toWkt' not implemented."); // Placeholder
  }

  toWkb(): Buffer {
    throw new Error("Method 'toWkb' not implemented."); // Placeholder
  }

  toTwkb(): Buffer {
    throw new Error("Method 'toTwkb' not implemented."); // Placeholder
  }

  _getWkbSize(): number {
    throw new Error("Method '_getWkbSize' not implemented."); // Placeholder
  }
}
