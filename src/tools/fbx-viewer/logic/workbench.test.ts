import { Bone, BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { fuzzyFilter, fuzzyMatch } from './fuzzyMatch';
import {
  eventKey,
  formatKeybinding,
  isPlainKey,
  matchesKeybinding,
  parseKeybinding,
} from './keybindings';
import { ancestorsOf, buildSceneTree } from './sceneTree';
import { SCENE_TAB, clampSize, closeTab, openTab, type EditorTab } from './workbenchLayout';

const ev = (
  key: string,
  mods: Partial<Record<'ctrl' | 'shift' | 'alt' | 'meta', boolean>> = {},
  code?: string,
) => ({
  key,
  code,
  ctrlKey: !!mods.ctrl,
  shiftKey: !!mods.shift,
  altKey: !!mods.alt,
  metaKey: !!mods.meta,
});

describe('clampSize', () => {
  it('最小・最大・画面に対する割合で制限する', () => {
    expect(clampSize('sidebar', 50, 1600)).toBe(170);
    expect(clampSize('sidebar', 2000, 1600)).toBe(600);
    expect(clampSize('sidebar', 500, 1000)).toBe(400);
    expect(clampSize('panel', 300, 900)).toBe(300);
    expect(clampSize('panel', NaN, 900)).toBe(220);
  });
});

describe('エディタのタブ', () => {
  const uv: EditorTab = { id: 'uv:a', kind: 'uv', title: 'UV: A', target: 'a' };
  const tex: EditorTab = { id: 'texture:b', kind: 'texture', title: 'b.png', target: 'b' };

  it('今のタブの右に開き、同じタブは開き直さない', () => {
    let s = openTab([SCENE_TAB], 'scene', uv);
    s = openTab(s.tabs, 'scene', tex);
    expect(s.tabs.map((t) => t.id)).toEqual(['scene', 'texture:b', 'uv:a']);
    s = openTab(s.tabs, 'texture:b', uv);
    expect(s.tabs).toHaveLength(3);
    expect(s.active).toBe('uv:a');
  });

  it('選択中のタブを閉じたら右隣、なければ左隣を選ぶ。3D ビューは閉じない', () => {
    const tabs = [SCENE_TAB, uv, tex];
    expect(closeTab(tabs, 'uv:a', 'uv:a')).toEqual({ tabs: [SCENE_TAB, tex], active: 'texture:b' });
    expect(closeTab(tabs, 'texture:b', 'texture:b').active).toBe('uv:a');
    expect(closeTab(tabs, 'scene', 'uv:a').active).toBe('scene');
    expect(closeTab(tabs, 'scene', 'scene').tabs).toHaveLength(3);
  });
});

describe('キーバインド', () => {
  it('表記を解析して照合する', () => {
    const b = parseKeybinding('Ctrl+Shift+P');
    expect(matchesKeybinding(b, ev('P', { ctrl: true, shift: true }, 'KeyP'))).toBe(true);
    expect(matchesKeybinding(b, ev('p', { ctrl: true }, 'KeyP'))).toBe(false);
    // Mac では ⌘ を Ctrl として扱う
    expect(matchesKeybinding(b, ev('p', { meta: true, shift: true }, 'KeyP'), true)).toBe(true);
  });

  it('Alt で文字が変わっても物理キーで照合する', () => {
    expect(eventKey(ev('∫', { alt: true }, 'KeyB'))).toBe('b');
    expect(
      matchesKeybinding(parseKeybinding('Ctrl+Alt+B'), ev('∫', { ctrl: true, alt: true }, 'KeyB')),
    ).toBe(true);
    expect(eventKey(ev(' ', {}, 'Space'))).toBe('space');
    expect(eventKey(ev('F1', {}, 'F1'))).toBe('f1');
  });

  it('表示用の表記と、修飾キーなしの判定', () => {
    expect(formatKeybinding('Ctrl+Shift+P')).toBe('Ctrl+Shift+P');
    expect(formatKeybinding('Ctrl+Shift+P', true)).toBe('⌘⇧P');
    expect(formatKeybinding('Space')).toBe('Space');
    expect(isPlainKey(parseKeybinding('W'))).toBe(true);
    expect(isPlainKey(parseKeybinding('F1'))).toBe(false);
    expect(isPlainKey(parseKeybinding('Ctrl+B'))).toBe(false);
  });
});

describe('fuzzyMatch', () => {
  it('部分一致を最優先し、順番どおりの文字でも一致する', () => {
    expect(fuzzyMatch('ワイヤー', '表示: ワイヤーフレームの切り替え')).not.toBeNull();
    expect(fuzzyMatch('tgl side', 'Toggle Sidebar')).not.toBeNull();
    expect(fuzzyMatch('xyz', 'Toggle Sidebar')).toBeNull();
  });

  it('点数の高い順に並べる', () => {
    const items = ['パネルの表示切り替え', 'サイドバーの表示切り替え', 'ファイルを開く'];
    expect(fuzzyFilter(items, 'サイドバー', (s) => s).map((r) => r.item)).toEqual([
      'サイドバーの表示切り替え',
    ]);
    expect(fuzzyFilter(items, '', (s) => s)).toHaveLength(3);
  });
});

describe('buildSceneTree', () => {
  it('種類つきのツリーにし、補助オブジェクトは除く', () => {
    const root = new Group();
    const hips = new Bone();
    hips.name = 'Hips';
    const spine = new Bone();
    spine.name = 'Spine';
    hips.add(spine);
    const body = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    body.name = 'Body';
    const helper = new Mesh();
    helper.name = '__wireframe_overlay__';
    body.add(helper);
    root.add(hips, body);
    const tree = buildSceneTree(root);
    expect(tree.map((n) => [n.name, n.kind])).toEqual([
      ['Hips', 'bone'],
      ['Body', 'mesh'],
    ]);
    expect(tree[1].children).toEqual([]);
    expect(ancestorsOf(tree, spine.uuid)).toEqual([hips.uuid]);
    expect(ancestorsOf(tree, 'none')).toBeNull();
  });
});
