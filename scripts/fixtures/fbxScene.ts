/**
 * FBX のシーン（モデル・メッシュ・マテリアル・ボーン・スキン・アニメ）を組み立てて、
 * バイナリ FBX のノード木に変換するビルダー。サンプル生成スクリプトから使う。
 */
import {
  D,
  I,
  L,
  R,
  S,
  ad,
  af,
  ai,
  al,
  node,
  objectName,
  writeFbxBinary,
  type FbxNode,
  type FbxProp,
} from './fbxBinaryWriter.ts';

export type Vec3 = [number, number, number];

/** FBX の時間単位（1 秒 = 46186158000）。 */
const KTIME_PER_SECOND = 46186158000n;
const toKTime = (sec: number) => (BigInt(Math.round(sec * 1000)) * KTIME_PER_SECOND) / 1000n;

export interface MeshInput {
  name: string;
  /** コントロールポイント（頂点）の座標 */
  positions: Vec3[];
  /** 面ごとのコントロールポイント番号（3 角形か 4 角形） */
  polygons: number[][];
  /** 面の頂点ごとの UV（polygons と同じ形）。省略すると UV なし */
  uvs?: [number, number][][];
  /**
   * 法線。true（既定）なら面法線（角ばった見た目）、false なら書き出さない、
   * 配列ならコントロールポイントごとの法線（なめらかな見た目）。
   */
  normals?: boolean | Vec3[];
  translation?: Vec3;
  rotation?: Vec3;
  scaling?: Vec3;
  parent?: number;
}

export interface TextureInput {
  name: string;
  fileName: string;
  /** 埋め込む画像。省略すると外部参照になる */
  embedded?: Uint8Array;
}

export interface BoneInput {
  name: string;
  parent?: number;
  /** 親からの相対位置 */
  translation: Vec3;
}

export interface CurveInput {
  modelId: number;
  attr: 'T' | 'R';
  times: number[];
  /** 軸ごとの値（R は度） */
  x?: number[];
  y?: number[];
  z?: number[];
}

let nextId = 1000000;
const newId = () => nextId++;

export class FbxSceneBuilder {
  private objects: FbxNode[] = [];
  private connections: FbxNode[] = [];
  private bonesWorld = new Map<number, Vec3>();
  private poseNodes: { id: number; matrix: number[] }[] = [];

  private readonly opts: { unitScaleFactor: number; upAxis?: 1 | 2 };

  constructor(opts: { unitScaleFactor: number; upAxis?: 1 | 2 }) {
    this.opts = opts;
  }

  private connect(child: number, parent: number, prop?: string) {
    const props: FbxProp[] = [S(prop ? 'OP' : 'OO'), L(child), L(parent)];
    if (prop) props.push(S(prop));
    this.connections.push(node('C', props));
  }

  private transformProps(t?: Vec3, r?: Vec3, s?: Vec3): FbxNode[] {
    const p: FbxNode[] = [];
    if (t)
      p.push(node('P', [S('Lcl Translation'), S('Lcl Translation'), S(''), S('A'), ...t.map(D)]));
    if (r) p.push(node('P', [S('Lcl Rotation'), S('Lcl Rotation'), S(''), S('A'), ...r.map(D)]));
    if (s) p.push(node('P', [S('Lcl Scaling'), S('Lcl Scaling'), S(''), S('A'), ...s.map(D)]));
    return p;
  }

  /** メッシュを追加し、[モデル ID, ジオメトリ ID] を返す。 */
  addMesh(m: MeshInput): { modelId: number; geometryId: number } {
    const geometryId = newId();
    const modelId = newId();
    const vertices = m.positions.flat();
    const index: number[] = [];
    for (const poly of m.polygons) {
      poly.forEach((v, i) => index.push(i === poly.length - 1 ? ~v : v));
    }
    const geoChildren: FbxNode[] = [
      node('Vertices', [ad(vertices)]),
      node('PolygonVertexIndex', [ai(index)]),
      node('GeometryVersion', [I(124)]),
    ];
    if (m.normals !== false) {
      const normals: number[] = [];
      const pointNormals = Array.isArray(m.normals) ? m.normals : null;
      for (const poly of m.polygons) {
        if (pointNormals) {
          for (const i of poly) normals.push(...pointNormals[i]);
        } else {
          const n = faceNormal(poly.map((i) => m.positions[i]));
          for (let k = 0; k < poly.length; k++) normals.push(...n);
        }
      }
      geoChildren.push(
        node(
          'LayerElementNormal',
          [I(0)],
          [
            node('Version', [I(102)]),
            node('Name', [S('')]),
            node('MappingInformationType', [S('ByPolygonVertex')]),
            node('ReferenceInformationType', [S('Direct')]),
            node('Normals', [ad(normals)]),
          ],
        ),
      );
    }
    if (m.uvs) {
      const uv = m.uvs.flat().flat();
      geoChildren.push(
        node(
          'LayerElementUV',
          [I(0)],
          [
            node('Version', [I(101)]),
            node('Name', [S('UVMap')]),
            node('MappingInformationType', [S('ByPolygonVertex')]),
            node('ReferenceInformationType', [S('IndexToDirect')]),
            node('UV', [ad(uv)]),
            node('UVIndex', [
              ai(
                uv
                  .map((_, i) => i)
                  .filter((i) => i % 2 === 0)
                  .map((i) => i / 2),
              ),
            ]),
          ],
        ),
      );
    }
    geoChildren.push(
      node(
        'LayerElementMaterial',
        [I(0)],
        [
          node('Version', [I(101)]),
          node('Name', [S('')]),
          node('MappingInformationType', [S('AllSame')]),
          node('ReferenceInformationType', [S('IndexToDirect')]),
          node('Materials', [ai([0])]),
        ],
      ),
    );
    this.objects.push(
      node('Geometry', [L(geometryId), S(objectName(m.name, 'Geometry')), S('Mesh')], geoChildren),
    );
    this.objects.push(
      node(
        'Model',
        [L(modelId), S(objectName(m.name, 'Model')), S('Mesh')],
        [
          node('Version', [I(232)]),
          node('Properties70', [], this.transformProps(m.translation, m.rotation, m.scaling)),
          node('Shading', [{ t: 'C', v: true }]),
          node('Culling', [S('CullingOff')]),
        ],
      ),
    );
    this.connect(geometryId, modelId);
    this.connect(modelId, m.parent ?? 0);
    return { modelId, geometryId };
  }

  addMaterial(name: string, modelId: number, color: Vec3 = [0.8, 0.8, 0.8]): number {
    const id = newId();
    this.objects.push(
      node(
        'Material',
        [L(id), S(objectName(name, 'Material')), S('')],
        [
          node('Version', [I(102)]),
          node('ShadingModel', [S('phong')]),
          node('MultiLayer', [I(0)]),
          node(
            'Properties70',
            [],
            [
              node('P', [S('DiffuseColor'), S('Color'), S(''), S('A'), ...color.map(D)]),
              node('P', [S('SpecularColor'), S('Color'), S(''), S('A'), D(0.12), D(0.12), D(0.12)]),
              node('P', [S('Shininess'), S('double'), S('Number'), S(''), D(12)]),
            ],
          ),
        ],
      ),
    );
    this.connect(id, modelId);
    return id;
  }

  addTexture(t: TextureInput, materialId: number, slot = 'DiffuseColor'): number {
    const id = newId();
    this.objects.push(
      node(
        'Texture',
        [L(id), S(objectName(t.name, 'Texture')), S('')],
        [
          node('Type', [S('TextureVideoClip')]),
          node('Version', [I(202)]),
          node('TextureName', [S(objectName(t.name, 'Texture'))]),
          node('FileName', [S(t.fileName)]),
          node('RelativeFilename', [S(t.fileName)]),
        ],
      ),
    );
    this.connect(id, materialId, slot);
    // 外部参照でも Video ノードは必要（FBXLoader はここからファイル名を引く）
    const videoId = newId();
    this.objects.push(
      node(
        'Video',
        [L(videoId), S(objectName(t.name, 'Video')), S('Clip')],
        [
          node('Type', [S('Clip')]),
          node('Filename', [S(t.fileName)]),
          node('RelativeFilename', [S(t.fileName)]),
          ...(t.embedded ? [node('Content', [R(t.embedded)])] : []),
        ],
      ),
    );
    this.connect(videoId, id);
    return id;
  }

  addBone(b: BoneInput): number {
    const id = newId();
    const attrId = newId();
    const parentWorld = b.parent !== undefined ? this.bonesWorld.get(b.parent)! : [0, 0, 0];
    const world: Vec3 = [
      parentWorld[0] + b.translation[0],
      parentWorld[1] + b.translation[1],
      parentWorld[2] + b.translation[2],
    ];
    this.bonesWorld.set(id, world);
    this.objects.push(
      node(
        'NodeAttribute',
        [L(attrId), S(objectName(b.name, 'NodeAttribute')), S('LimbNode')],
        [node('TypeFlags', [S('Skeleton')])],
      ),
    );
    this.objects.push(
      node(
        'Model',
        [L(id), S(objectName(b.name, 'Model')), S('LimbNode')],
        [
          node('Version', [I(232)]),
          node('Properties70', [], this.transformProps(b.translation, [0, 0, 0], [1, 1, 1])),
        ],
      ),
    );
    this.connect(attrId, id);
    this.connect(id, b.parent ?? 0);
    this.poseNodes.push({ id, matrix: translationMatrix(world) });
    return id;
  }

  /** スキンを追加する。clusters はボーンごとのコントロールポイント番号とウェイト。 */
  addSkin(
    geometryId: number,
    meshModelId: number,
    clusters: { boneId: number; indices: number[]; weights: number[] }[],
  ) {
    const skinId = newId();
    this.objects.push(
      node(
        'Deformer',
        [L(skinId), S(objectName('Skin', 'Deformer')), S('Skin')],
        [node('Version', [I(101)]), node('Link_DeformAcuracy', [D(50)])],
      ),
    );
    this.connect(skinId, geometryId);
    for (const c of clusters) {
      const id = newId();
      const world = this.bonesWorld.get(c.boneId)!;
      this.objects.push(
        node(
          'Deformer',
          [L(id), S(objectName('Cluster', 'SubDeformer')), S('Cluster')],
          [
            node('Version', [I(100)]),
            node('UserData', [S(''), S('')]),
            node('Indexes', [ai(c.indices)]),
            node('Weights', [ad(c.weights)]),
            node('Transform', [ad(translationMatrix([-world[0], -world[1], -world[2]]))]),
            node('TransformLink', [ad(translationMatrix(world))]),
          ],
        ),
      );
      this.connect(id, skinId);
      this.connect(c.boneId, id);
    }
    this.poseNodes.push({ id: meshModelId, matrix: translationMatrix([0, 0, 0]) });
  }

  addAnimation(name: string, duration: number, curves: CurveInput[]) {
    const stackId = newId();
    const layerId = newId();
    this.objects.push(
      node(
        'AnimationStack',
        [L(stackId), S(objectName(name, 'AnimStack')), S('')],
        [
          node(
            'Properties70',
            [],
            [
              node('P', [S('LocalStop'), S('KTime'), S('Time'), S(''), L(toKTime(duration))]),
              node('P', [S('ReferenceStop'), S('KTime'), S('Time'), S(''), L(toKTime(duration))]),
            ],
          ),
        ],
      ),
    );
    this.objects.push(
      node('AnimationLayer', [L(layerId), S(objectName('BaseLayer', 'AnimLayer')), S('')]),
    );
    this.connect(layerId, stackId);
    for (const c of curves) {
      const curveNodeId = newId();
      const prop = c.attr === 'T' ? 'Lcl Translation' : 'Lcl Rotation';
      const axes = (['x', 'y', 'z'] as const).filter((a) => c[a] !== undefined);
      this.objects.push(
        node(
          'AnimationCurveNode',
          [L(curveNodeId), S(objectName(c.attr, 'AnimCurveNode')), S('')],
          [
            node(
              'Properties70',
              [],
              axes.map((a) =>
                node('P', [S(`d|${a.toUpperCase()}`), S('Number'), S(''), S('A'), D(c[a]![0])]),
              ),
            ),
          ],
        ),
      );
      this.connect(curveNodeId, layerId);
      this.connect(curveNodeId, c.modelId, prop);
      for (const a of axes) {
        const curveId = newId();
        const values = c[a]!;
        this.objects.push(
          node(
            'AnimationCurve',
            [L(curveId), S(objectName('', 'AnimCurve')), S('')],
            [
              node('Default', [D(values[0])]),
              node('KeyVer', [I(4009)]),
              node('KeyTime', [al(c.times.map(toKTime))]),
              node('KeyValueFloat', [af(values)]),
              node('KeyAttrFlags', [ai([24840])]),
              node('KeyAttrDataFloat', [af([0, 0, 218434821, 0])]),
              node('KeyAttrRefCount', [ai([values.length])]),
            ],
          ),
        );
        this.connect(curveId, curveNodeId, `d|${a.toUpperCase()}`);
      }
    }
  }

  build(): Uint8Array {
    const nodes: FbxNode[] = [
      node(
        'FBXHeaderExtension',
        [],
        [
          node('FBXHeaderVersion', [I(1003)]),
          node('FBXVersion', [I(7400)]),
          node('Creator', [S('tool-web-FbxViewer sample generator')]),
        ],
      ),
      node(
        'GlobalSettings',
        [],
        [
          node('Version', [I(1000)]),
          node(
            'Properties70',
            [],
            [
              node('P', [S('UpAxis'), S('int'), S('Integer'), S(''), I(this.opts.upAxis ?? 1)]),
              node('P', [S('UpAxisSign'), S('int'), S('Integer'), S(''), I(1)]),
              node('P', [S('FrontAxis'), S('int'), S('Integer'), S(''), I(2)]),
              node('P', [S('FrontAxisSign'), S('int'), S('Integer'), S(''), I(1)]),
              node('P', [S('CoordAxis'), S('int'), S('Integer'), S(''), I(0)]),
              node('P', [S('CoordAxisSign'), S('int'), S('Integer'), S(''), I(1)]),
              node('P', [
                S('UnitScaleFactor'),
                S('double'),
                S('Number'),
                S(''),
                D(this.opts.unitScaleFactor),
              ]),
            ],
          ),
        ],
      ),
    ];
    const objects = [...this.objects];
    if (this.poseNodes.length > 0) {
      objects.push(
        node(
          'Pose',
          [L(newId()), S(objectName('BindPose', 'Pose')), S('BindPose')],
          [
            node('Type', [S('BindPose')]),
            node('Version', [I(100)]),
            node('NbPoseNodes', [I(this.poseNodes.length)]),
            ...this.poseNodes.map((p) =>
              node('PoseNode', [], [node('Node', [L(p.id)]), node('Matrix', [ad(p.matrix)])]),
            ),
          ],
        ),
      );
    }
    nodes.push(node('Objects', [], objects));
    nodes.push(node('Connections', [], this.connections));
    return writeFbxBinary(nodes);
  }
}

function translationMatrix([x, y, z]: Vec3): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

function faceNormal(p: Vec3[]): Vec3 {
  const [a, b, c] = p;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const len = Math.hypot(...n) || 1;
  return [n[0] / len, n[1] / len, n[2] / len];
}
