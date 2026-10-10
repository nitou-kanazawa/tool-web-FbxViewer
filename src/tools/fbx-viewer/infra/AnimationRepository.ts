/** アニメ FBX の保存先（設計書 §5.9）。AnimationService はこのインターフェースだけを知る。 */
export interface StoredAnimation {
  id: string;
  name: string;
  addedAt: number;
}

export interface AnimationRepository {
  /** 保存先が永続化されるか（画面の表示に使う） */
  readonly persistent: boolean;
  list(): Promise<StoredAnimation[]>;
  load(id: string): Promise<ArrayBuffer | null>;
  save(name: string, data: ArrayBuffer): Promise<StoredAnimation>;
  remove(id: string): Promise<void>;
}

export function newAnimationId(): string {
  return `anim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** メモリに保存する実装（ページを閉じると消える）。 */
export class MemoryAnimationRepository implements AnimationRepository {
  readonly persistent = false;
  private readonly items = new Map<string, StoredAnimation & { data: ArrayBuffer }>();

  async list(): Promise<StoredAnimation[]> {
    return [...this.items.values()]
      .map(({ id, name, addedAt }) => ({ id, name, addedAt }))
      .sort((a, b) => a.addedAt - b.addedAt);
  }

  async load(id: string): Promise<ArrayBuffer | null> {
    return this.items.get(id)?.data ?? null;
  }

  async save(name: string, data: ArrayBuffer): Promise<StoredAnimation> {
    const item = { id: newAnimationId(), name, addedAt: Date.now() };
    this.items.set(item.id, { ...item, data });
    return item;
  }

  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }
}
