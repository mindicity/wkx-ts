# wkx-ts 

```bash
npm install wkx-ts
```

wkx-ts is a typescript version of the wkx library. 

A WKT/WKB/EWKT/EWKB/TWKB/GeoJSON parser and serializer with support for

- Point
- LineString
- Polygon
- MultiPoint
- MultiLineString
- MultiPolygon
- GeometryCollection

Examples
--------

The following examples show you how to work with wkx.

```typescript
import { Geometry, Point } from 'wkx-ts';

//Parsing a WKT string
var geometry = Geometry.parse('POINT(1 2)');

//Parsing an EWKT string
var geometry = Geometry.parse('SRID=4326;POINT(1 2)');

//Parsing a node Buffer containing a WKB object
var geometry = Geometry.parse(wkbBuffer);

//Parsing a node Buffer containing an EWKB object
var geometry = Geometry.parse(ewkbBuffer);

//Parsing a node Buffer containing a TWKB object
var geometry = Geometry.parseTwkb(twkbBuffer);

//Parsing a GeoJSON object
var geometry = Geometry.parseGeoJSON({ type: 'Point', coordinates: [1, 2] });

//Serializing a Point geometry to WKT
var wktString = new Point(1, 2).toWkt();

//Serializing a Point geometry to WKB
var wkbBuffer = new Point(1, 2).toWkb();

//Serializing a Point geometry to EWKT
var ewktString = new Point(1, 2, 0, 0, 4326).toEwkt();

//Serializing a Point geometry to EWKB
var ewkbBuffer = new Point(1, 2, 0, 0, 4326).toEwkb();

//Serializing a Point geometry to TWKB
var twkbBuffer = new Point(1, 2).toTwkb();

//Serializing a Point geometry to GeoJSON
var geoJSONObject = new Point(1, 2).toGeoJSON();
```

----

Regardless of which of the preceeding options you choose, using `wkx` in the browser will look the same:
```typescript
import { Geometry } from 'wkx-ts';

const geometry = Geometry.parse('POINT(1 2)');

console.log(geometry.toGeoJSON());
```

In addition to the `wkx-ts` module, you should install the `buffer` module to use the `Buffer` class in the browser.

```bash
npm install buffer
```

```typescript
import {Buffer} from 'buffer/index'; // To use the node_modules version of the Buffer class
import { Geometry } from 'wkx-ts';

const wkbBuffer = new Buffer('0101000000000000000000f03f0000000000000040', 'hex');
const geometry = Geometry.parse(wkbBuffer);

console.log(geometry.toGeoJSON());
```
