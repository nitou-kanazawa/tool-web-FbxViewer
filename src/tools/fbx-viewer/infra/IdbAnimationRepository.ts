import { createStore, del, entries, get, set, type UseStore } from 'idb-keyval';
import {
  newAnimationId,
  type AnimationRepository,
  type StoredAnimation,
} from './AnimationRepository';

interface Row extends StoredAnimation {
  data: ArrayBuffer;
}

/**
 * ブラウザ内（IndexedDB）に保存する実装（F-2-10）。
 * データは利用者の端末の中だけに保存され、外部には送信されない。
 */
export class IdbAnimationRepository implements AnimationRepository {
  readonly persistent = true;
  private readonly store: UseStore;

  constructor() {
    this.store = createStore('fbx-viewer', 'animations');
  }

  async list(): Promise<StoredAnimation[]> {
    const rows = await entries<string, Row>(this.store);
    return rows
      .map(([, { id, name, addedAt }]) => ({ id, name, addedAt }))
      .sort((a, b) => a.addedAt - b.addedAt);
  }

  async load(id: string): Promise<ArrayBuffer | null> {
    return (await get<Row>(id, this.store))?.data ?? null;
  }

  async save(name: string, data: ArrayBuffer): Promise<StoredAnimation> {
    const item = { id: newAnimationId(), name, addedAt: Date.now() };
    await set(item.id, { ...item, data }, this.store);
    return item;
  }

  async remove(id: string): Promise<void> {
    await del(id, this.store);
  }
}

/** IndexedDB が使えればそれを、使えなければメモリ実装を返す。 */
export async function isIndexedDbAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false;
    const repo = new IdbAnimationRepository();
    await repo.list();
    return true;
  } catch {
    return false;
  }
}
