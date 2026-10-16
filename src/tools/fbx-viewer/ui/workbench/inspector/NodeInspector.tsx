import { useMemo } from 'react';
import { Euler, type Bone, type Mesh, type Object3D, type SkinnedMesh } from 'three';
import { boneWeightsOf } from '../../../logic/boneWeights';
import { formatNumber } from '../../../logic/format';
import { triangleCount } from '../../../logic/modelStats';
import { hasOriginalVertexColors, originalMaterialsOf } from '../../../services/DisplayModeManager';
import { kindLabel, nodeKind } from '../../../logic/sceneTree';
import { useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { openUvEditor, selectNode, toggleWeights } from '../actions';
import { PropertyGrid, Row, Section } from '../primitives';
import { vsc } from '../styles';
import { MaterialIcon, NodeIcon } from '../views/icons';

const fmt = (v: number) => (Math.abs(v) < 1e-6 ? '0' : +v.toFixed(3) + '');
const vec = (x: number, y: number, z: number) => `${fmt(x)}, ${fmt(y)}, ${fmt(z)}`;

/** シーンのノード（メッシュ・ボーン・グループ）の詳細。 */
export function NodeInspector({ object }: { object: Object3D }) {
  const kind = nodeKind(object);
  const shading = useViewerStore((s) => s.shading);
  const selectedBone = useViewerStore((s) => s.selectedBoneUuid);
  const select = useWorkbenchStore((s) => s.select);
  const e = new Euler().setFromQuaternion(object.quaternion);
  const deg = (r: number) => (r * 180) / Math.PI;
  const mesh = object as Mesh;

  return (
    <>
      <Section title={kindLabel(kind)}>
        <div
          className={`flex h-[26px] items-center gap-1.5 px-3 text-[13px] font-semibold ${vsc.strong}`}
        >
          <NodeIcon kind={kind} />
          <span className="truncate" data-testid="inspector-title">
            {object.name || '(名前なし)'}
          </span>
        </div>
        <PropertyGrid
          rows={[
            ['位置', vec(object.position.x, object.position.y, object.position.z)],
            ['回転（度）', vec(deg(e.x), deg(e.y), deg(e.z))],
            ['スケール', vec(object.scale.x, object.scale.y, object.scale.z)],
            ['子の数', String(object.children.filter((c) => !c.name.startsWith('__')).length)],
          ]}
        />
      </Section>
      {mesh.isMesh && (
        <MeshSections mesh={mesh} onMaterial={(uuid) => select({ kind: 'material', uuid })} />
      )}
      {kind === 'bone' && (
        <BoneSection
          bone={object as Bone}
          weightsOn={shading === 'boneWeight' && selectedBone === object.uuid}
        />
      )}
      {object.parent && nodeKind(object.parent) !== 'group' && (
        <Section title="親">
          <Row
            icon={<NodeIcon kind={nodeKind(object.parent)} />}
            label={object.parent.name || '(名前なし)'}
            onClick={() => selectNode(object.parent!.uuid)}
          />
        </Section>
      )}
    </>
  );
}

function MeshSections({ mesh, onMaterial }: { mesh: Mesh; onMaterial: (uuid: string) => void }) {
  const g = mesh.geometry;
  const skinned = (mesh as SkinnedMesh).isSkinnedMesh;
  const attrs = [
    g.getAttribute('uv') && 'UV0',
    g.getAttribute('uv1') && 'UV1',
    g.getAttribute('normal') && '法線',
    hasOriginalVertexColors(mesh) && '頂点カラー',
    skinned && 'スキン',
  ]
    .filter(Boolean)
    .join(' / ');
  return (
    <>
      <Section title="ジオメトリ">
        <PropertyGrid
          rows={[
            ['頂点', formatNumber(g.getAttribute('position')?.count ?? 0)],
            ['三角形', formatNumber(triangleCount(g))],
            ['属性', attrs || 'なし'],
            ['シェイプキー', String(g.morphAttributes.position?.length ?? 0)],
            ...(skinned
              ? ([['ボーン', String((mesh as SkinnedMesh).skeleton.bones.length)]] as [
                  string,
                  string,
                ][])
              : []),
          ]}
        />
        {g.getAttribute('uv') && (
          <div className="px-3 pt-1">
            <button
              type="button"
              className={`text-[12px] ${vsc.link}`}
              onClick={() => openUvEditor(mesh)}
            >
              UV エディタで開く
            </button>
          </div>
        )}
      </Section>
      <Section title="マテリアル">
        {originalMaterialsOf(mesh).map((m) => (
          <Row
            key={m.uuid}
            icon={<MaterialIcon />}
            label={m.name || '(名前なし)'}
            description={m.type}
            onClick={() => onMaterial(m.uuid)}
          />
        ))}
      </Section>
    </>
  );
}

function BoneSection({ bone, weightsOn }: { bone: Bone; weightsOn: boolean }) {
  const model = useViewerStore((s) => s.model);
  // このボーンの影響を受ける頂点の数（全スキンメッシュの合計）
  const influenced = useMemo(() => {
    let count = 0;
    model?.root.traverse((o) => {
      const m = o as SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      const index = m.skeleton.bones.indexOf(bone);
      if (index < 0) return;
      for (const w of boneWeightsOf(m.geometry, index)) if (w > 0) count++;
    });
    return count;
  }, [model, bone]);
  return (
    <Section title="ボーン">
      <PropertyGrid
        rows={[
          ['影響する頂点', formatNumber(influenced)],
          ['子ボーン', String(bone.children.filter((c) => (c as Bone).isBone).length)],
        ]}
      />
      <div className="px-3 pt-1">
        <button
          type="button"
          className={`text-[12px] ${vsc.link}`}
          onClick={() => {
            if (weightsOn) return toggleWeights();
            selectNode(bone.uuid);
            useViewerStore.getState().setView({ shading: 'boneWeight' });
          }}
        >
          {weightsOn ? 'ウェイト表示をやめる' : 'このボーンのウェイトを表示'}
        </button>
      </div>
    </Section>
  );
}
