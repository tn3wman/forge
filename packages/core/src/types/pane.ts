export type PaneNode =
  | { type: 'leaf'; id: string; tabs: string[]; activeTab: string | null }
  | {
      type: 'split';
      direction: 'horizontal' | 'vertical';
      children: [PaneNode, PaneNode];
      ratio: number;
    };
