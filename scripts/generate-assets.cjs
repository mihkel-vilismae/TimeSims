const fs = require('fs');
const path = require('path');

/*
 * Generates a set of simple glTF 2.0 assets.  Each asset consists of a single
 * cube primitive with a different base colour and scale.  The cube geometry
 * comprises 8 vertices and 12 triangles (36 indices).  The resulting JSON is
 * self‑contained: all geometry data is embedded in a base64 encoded buffer.
 *
 * Running this script will create a collection of .gltf files under the
 * destination directory passed as the first argument.  If no destination
 * directory is provided it defaults to `public/assets/models`.  You should run this
 * script from the repository root via `node scripts/generate-assets.cjs`.  The
 * generated files are committed into source control so the project has
 * reproducible assets without external dependencies.
 */

// Vertex positions for a unit cube centred on the origin.  Each vertex is
// represented as an array of [x, y, z] coordinates.  See README for a
// description of the triangle layout.
const positions = [
  [-0.5, -0.5,  0.5], // 0 front bottom left
  [ 0.5, -0.5,  0.5], // 1 front bottom right
  [ 0.5,  0.5,  0.5], // 2 front top right
  [-0.5,  0.5,  0.5], // 3 front top left
  [-0.5, -0.5, -0.5], // 4 back bottom left
  [ 0.5, -0.5, -0.5], // 5 back bottom right
  [ 0.5,  0.5, -0.5], // 6 back top right
  [-0.5,  0.5, -0.5], // 7 back top left
];

// Indices for the 12 triangles composing the cube.  Each group of three
// consecutive numbers defines one triangle.  Faces are wound counter‑clockwise
// when viewed from the outside.
const indices = [
  0, 1, 2,  2, 3, 0, // front
  1, 5, 6,  6, 2, 1, // right
  5, 4, 7,  7, 6, 5, // back
  4, 0, 3,  3, 7, 4, // left
  3, 2, 6,  6, 7, 3, // top
  4, 5, 1,  1, 0, 4, // bottom
];

function flattenPositions(arr) {
  const out = new Float32Array(arr.length * 3);
  for (let i = 0; i < arr.length; i++) {
    out[i * 3 + 0] = arr[i][0];
    out[i * 3 + 1] = arr[i][1];
    out[i * 3 + 2] = arr[i][2];
  }
  return out;
}

function flattenIndices(arr) {
  const out = new Uint16Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[i];
  return out;
}

function buildGltf(assetName, colour, scale) {
  const posArray = flattenPositions(positions);
  const idxArray = flattenIndices(indices);
  const posByteLength = posArray.byteLength;
  const idxByteLength = idxArray.byteLength;
  const buffer = Buffer.alloc(posByteLength + idxByteLength);
  Buffer.from(posArray.buffer).copy(buffer, 0);
  Buffer.from(idxArray.buffer).copy(buffer, posByteLength);
  const base64Buffer = buffer.toString('base64');
  const bufferUri = `data:application/octet-stream;base64,${base64Buffer}`;
  const gltf = {
    asset: { version: '2.0', generator: 'Timesims Asset Generator' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [
      { mesh: 0, scale: scale }
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            material: 0
          }
        ]
      }
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [...colour, 1.0],
          metallicFactor: 0.0,
          roughnessFactor: 0.8
        }
      }
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: positions.length,
        type: 'VEC3',
        max: [0.5, 0.5, 0.5],
        min: [-0.5, -0.5, -0.5]
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5123,
        count: indices.length,
        type: 'SCALAR'
      }
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: posByteLength
      },
      {
        buffer: 0,
        byteOffset: posByteLength,
        byteLength: idxByteLength
      }
    ],
    buffers: [
      {
        uri: bufferUri,
        byteLength: buffer.byteLength
      }
    ]
  };
  return gltf;
}

const assets = {
  infantry: { colour: [0.4, 0.8, 0.4], scale: [0.5, 0.8, 0.5] },
  tank: { colour: [0.8, 0.4, 0.4], scale: [1.5, 0.6, 2.0] },
  ifv: { colour: [0.3, 0.6, 0.8], scale: [1.3, 0.6, 1.6] },
  bunker: { colour: [0.7, 0.7, 0.6], scale: [2.0, 1.0, 2.0] },
  weapon_small: { colour: [0.3, 0.3, 0.3], scale: [0.4, 0.4, 0.8] },
  weapon_large: { colour: [0.4, 0.4, 0.4], scale: [0.6, 0.6, 1.2] },
  projectile: { colour: [1.0, 0.8, 0.2], scale: [0.3, 0.3, 0.3] },
  muzzle_flash: { colour: [1.0, 0.6, 0.2], scale: [0.6, 0.1, 0.6] },
  smoke: { colour: [0.7, 0.7, 0.7], scale: [1.2, 1.2, 1.2] }
};

function main() {
  const outDir = path.resolve(process.argv[2] || 'public/assets/models');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  for (const [name, spec] of Object.entries(assets)) {
    const gltf = buildGltf(name, spec.colour, spec.scale);
    const filename = path.join(outDir, `${name}.gltf`);
    fs.writeFileSync(filename, JSON.stringify(gltf, null, 2));
    console.log(`Generated ${filename}`);
  }
}

if (require.main === module) {
  main();
}