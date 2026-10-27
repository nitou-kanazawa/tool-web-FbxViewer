/**
 * VS Code の Dark+ / Light+ に合わせた配色（設計書 §15.5）。
 * Tailwind のクラスの組み合わせを定数にして、画面部品の間で揃える。
 */
export const vsc = {
  editor: 'bg-white dark:bg-[#1e1e1e]',
  sidebar: 'bg-[#f3f3f3] dark:bg-[#252526]',
  activity: 'bg-[#2c2c2c] dark:bg-[#333333]',
  title: 'bg-[#dddddd] dark:bg-[#3c3c3c]',
  tabBar: 'bg-[#f3f3f3] dark:bg-[#252526]',
  tabInactive: 'bg-[#ececec] text-[#717171] dark:bg-[#2d2d2d] dark:text-[#969696]',
  tabActive: 'bg-white text-[#333333] dark:bg-[#1e1e1e] dark:text-white',
  border: 'border-[#e5e5e5] dark:border-[#2b2b2b]',
  text: 'text-[#616161] dark:text-[#cccccc]',
  strong: 'text-[#333333] dark:text-[#e7e7e7]',
  muted: 'text-[#717171] dark:text-[#8b8b8b]',
  hover: 'hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]',
  selected: 'bg-[#0060c0] text-white dark:bg-[#04395e] dark:text-white',
  input:
    'rounded-sm border border-[#cecece] bg-white text-[#333333] outline-none focus:border-[#0090f1] dark:border-[#3c3c3c] dark:bg-[#3c3c3c] dark:text-[#cccccc] dark:focus:border-[#007fd4]',
  button:
    'rounded-sm bg-[#007acc] px-3 py-1 text-white hover:bg-[#0062a3] dark:bg-[#0e639c] dark:hover:bg-[#1177bb]',
  buttonSecondary:
    'rounded-sm bg-[#5f6a79] px-3 py-1 text-white hover:bg-[#4c5561] dark:bg-[#3a3d41] dark:hover:bg-[#45494e]',
  focus:
    'focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-[#0090f1] dark:focus-visible:outline-[#007fd4]',
  sectionHeader: 'text-[11px] font-bold uppercase tracking-wide',
  error: 'text-[#e51400] dark:text-[#f14c4c]',
  warning: 'text-[#bf8803] dark:text-[#cca700]',
  info: 'text-[#1a85ff] dark:text-[#3794ff]',
  ok: 'text-[#388a34] dark:text-[#89d185]',
  link: 'text-[#006ab1] hover:underline dark:text-[#3794ff]',
} as const;
