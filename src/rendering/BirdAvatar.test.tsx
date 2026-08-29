import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createDemoState } from '../fixtures/seedBirds';
import type { Bird } from '../domain/types';
import { BirdAvatar } from './BirdAvatar';

describe('layered bird avatar', () => {
  it('renders named parameter layers with an accessible identity', () => {
    const bird = createDemoState().birds['BIRD-M-001'] as Bird;
    render(<BirdAvatar bird={bird} size="card" />);

    expect(
      screen.getByRole('img', { name: /桃脸牡丹.*晨露/ }),
    ).toBeVisible();
    expect(screen.getByTestId('bird-body')).toHaveAttribute(
      'fill',
      'var(--bird-green)',
    );
    expect(screen.getByTestId('bird-wing')).toBeInTheDocument();
    expect(screen.getByTestId('bird-face')).toBeInTheDocument();
    expect(screen.getByTestId('bird-tail')).toBeInTheDocument();
  });

  it('changes visible layers when phenotype parameters differ', () => {
    const state = createDemoState();
    const first = state.birds['BIRD-M-001'] as Bird;
    const second = state.birds['BIRD-F-003'] as Bird;
    const { rerender } = render(<BirdAvatar bird={first} size="detail" />);
    const before = screen.getByRole('img').getAttribute('style');

    rerender(<BirdAvatar bird={second} size="detail" />);

    expect(screen.getByRole('img').getAttribute('style')).not.toBe(before);
  });
});
