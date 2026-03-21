import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BayLayout } from '../BayLayout';

describe('BayLayout', () => {
  it('renders left rail, center, and right rail', () => {
    render(
      <BayLayout
        leftRailWidth={240}
        rightRailWidth={300}
        onLeftRailResize={() => {}}
        onRightRailResize={() => {}}
        onResizeEnd={() => {}}
        leftRail={<div>Left</div>}
        center={<div>Center</div>}
        rightRail={<div>Right</div>}
      />,
    );
    expect(screen.getByText('Left')).toBeDefined();
    expect(screen.getByText('Center')).toBeDefined();
    expect(screen.getByText('Right')).toBeDefined();
  });

  it('renders two resize handles', () => {
    render(
      <BayLayout
        leftRailWidth={240}
        rightRailWidth={300}
        onLeftRailResize={() => {}}
        onRightRailResize={() => {}}
        onResizeEnd={() => {}}
        leftRail={<div>Left</div>}
        center={<div>Center</div>}
        rightRail={<div>Right</div>}
      />,
    );
    const handles = screen.getAllByRole('separator');
    expect(handles).toHaveLength(2);
  });
});
