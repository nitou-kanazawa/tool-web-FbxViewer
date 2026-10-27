import { useRef, useState } from 'react';
import { DEFAULT_SIZES, clampSize, type PartKind } from '../../logic/workbenchLayout';
import { useWorkbenchStore } from '../../store/workbenchStore';

/**
 * 領域の境界をドラッグして大きさを変える（VS Code の sash）。ダブルクリックで既定の大きさに戻す。
 * side は「この境界をどちらに動かすと大きくなるか」（左のサイドバーなら右に動かすと大きくなる）。
 */
export function Sash({ kind, side }: { kind: PartKind; side: 'right' | 'left' | 'top' }) {
  const setSize = useWorkbenchStore((s) => s.setSize);
  const start = useRef<{ pos: number; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const vertical = side !== 'top';

  const viewport = () => (vertical ? window.innerWidth : window.innerHeight);

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={
        { sidebar: 'サイドバーの幅', inspector: 'インスペクターの幅', panel: 'パネルの高さ' }[kind]
      }
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = {
          pos: vertical ? e.clientX : e.clientY,
          size: useWorkbenchStore.getState().sizes[kind],
        };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const delta = (vertical ? e.clientX : e.clientY) - start.current.pos;
        const signed = side === 'right' ? delta : -delta;
        setSize(kind, clampSize(kind, start.current.size + signed, viewport()));
      }}
      onPointerUp={() => {
        start.current = null;
        setDragging(false);
      }}
      onDoubleClick={() => setSize(kind, DEFAULT_SIZES[kind])}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 10;
        const grow = vertical ? (side === 'right' ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
        const shrink = vertical ? (side === 'right' ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
        const size = useWorkbenchStore.getState().sizes[kind];
        if (e.key === grow) setSize(kind, clampSize(kind, size + step, viewport()));
        if (e.key === shrink) setSize(kind, clampSize(kind, size - step, viewport()));
      }}
      className={`absolute z-20 transition-colors delay-100 hover:bg-[#007fd4] focus-visible:bg-[#007fd4] focus-visible:outline-none ${
        dragging ? 'bg-[#007fd4]' : ''
      } ${
        vertical
          ? `top-0 h-full w-1 cursor-ew-resize ${side === 'right' ? '-right-0.5' : '-left-0.5'}`
          : 'inset-x-0 -top-0.5 h-1 cursor-ns-resize'
      }`}
    />
  );
}
