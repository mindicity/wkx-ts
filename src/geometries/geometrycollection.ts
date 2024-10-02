import { BinaryWriter } from "../utils/binarywriter";
import { CONSTANTS } from "../constants/constants";
import { Buffer } from "buffer/index";
import { Geometry } from "../index";

export class GeometryCollection extends Geometry {
  geometries: Geometry[];
  srid?: number;

  constructor(geometries: Geometry[] = [], srid?: number) {
    super();
    this.geometries = geometries;
    this.srid = srid;

    if (this.geometries.length > 0) {
      this.hasZ = this.geometries[0].hasZ;
      this.hasM = this.geometries[0].hasM;
    }
  }

  static Z(geometries: Geometry[], srid?: number): GeometryCollection {
    const geometryCollection = new GeometryCollection(geometries, srid);
    geometryCollection.hasZ = true;
    return geometryCollection;
  }

  static M(geometries: Geometry[], srid?: number): GeometryCollection {
    const geometryCollection = new GeometryCollection(geometries, srid);
    geometryCollection.hasM = true;
    return geometryCollection;
  }

  static ZM(geometries: Geometry[], srid?: number): GeometryCollection {
    const geometryCollection = new GeometryCollection(geometries, srid);
    geometryCollection.hasZ = true;
    geometryCollection.hasM = true;
    return geometryCollection;
  }

  static _parseWktWithOptions(value: any, options: any): GeometryCollection {
    const geometryCollection = new GeometryCollection();
    geometryCollection.srid = options.srid;
    geometryCollection.hasZ = options.hasZ;
    geometryCollection.hasM = options.hasM;

    if (value.isMatch(["EMPTY"])) {
      return geometryCollection;
    }

    value.expectGroupStart();
    do {
      geometryCollection.geometries.push(Geometry.parse(value));
    } while (value.isMatch([","]));
    value.expectGroupEnd();

    return geometryCollection;
  }

  static _parseWkb(value: any, options: any): GeometryCollection {
    const geometryCollection = new GeometryCollection();
    geometryCollection.srid = options.srid;
    geometryCollection.hasZ = options.hasZ;
    geometryCollection.hasM = options.hasM;

    const geometryCount = value.readUInt32();
    for (let i = 0; i < geometryCount; i++) {
      geometryCollection.geometries.push(Geometry.parse(value, options));
    }

    return geometryCollection;
  }

  static _parseTwkb(value: any, options: any): GeometryCollection {
    const geometryCollection = new GeometryCollection();
    geometryCollection.hasZ = options.hasZ;
    geometryCollection.hasM = options.hasM;

    if (options.isEmpty) {
      return geometryCollection;
    }

    const geometryCount = value.readVarInt();
    for (let i = 0; i < geometryCount; i++) {
      geometryCollection.geometries.push(Geometry.parseTwkb(value));
    }

    return geometryCollection;
  }

  static _parseGeoJSON(value: any): GeometryCollection {
    const geometryCollection = new GeometryCollection();
    for (let i = 0; i < value.geometries.length; i++) {
      geometryCollection.geometries.push(
        Geometry._parseGeoJSON(value.geometries[i], true),
      );
    }

    if (geometryCollection.geometries.length > 0) {
      geometryCollection.hasZ = geometryCollection.geometries[0].hasZ;
    }

    return geometryCollection;
  }

  toWkt(): string {
    if (this.geometries.length === 0) {
      return this._getWktType(CONSTANTS.wkt.GeometryCollection, true);
    }

    let wkt = this._getWktType(CONSTANTS.wkt.GeometryCollection, false) + "(";
    for (let i = 0; i < this.geometries.length; i++) {
      wkt += this.geometries[i].toWkt() + ",";
    }
    wkt = wkt.slice(0, -1) + ")";

    return wkt;
  }

  toWkb(): Buffer {
    const wkb = new BinaryWriter(this._getWkbSize());
    wkb.writeInt8(1);
    this._writeWkbType(wkb, CONSTANTS.wkb.GeometryCollection);
    wkb.writeUInt32LE(this.geometries.length);

    for (let i = 0; i < this.geometries.length; i++) {
      wkb.writeBuffer(this.geometries[i].toWkb(/* { srid: this.srid }*/));
    }

    return wkb.buffer;
  }

  toTwkb(): Buffer {
    const twkb = new BinaryWriter(0, true);
    const precision = Geometry.getTwkbPrecision(5, 0, 0);
    const isEmpty = this.geometries.length === 0;

    this._writeTwkbHeader(
      twkb,
      CONSTANTS.wkb.GeometryCollection,
      precision,
      isEmpty,
    );

    if (!isEmpty) {
      twkb.writeVarInt(this.geometries.length);
      for (let i = 0; i < this.geometries.length; i++) {
        twkb.writeBuffer(this.geometries[i].toTwkb());
      }
    }

    return twkb.buffer;
  }

  _getWkbSize(): number {
    let size = 1 + 4 + 4;
    for (let i = 0; i < this.geometries.length; i++) {
      size += this.geometries[i]._getWkbSize();
    }
    return size;
  }

  toGeoJSON(options?: { shortCrs?: boolean; longCrs?: boolean }): any {
    const geoJSON = super.toGeoJSON(options);
    geoJSON.type = CONSTANTS.geoJSON.GeometryCollection;
    geoJSON.geometries = this.geometries.map((geometry) =>
      geometry.toGeoJSON(),
    );

    return geoJSON;
  }
}
