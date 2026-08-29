import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('application shell', () => {
  it('introduces the breeding-first prototype in Chinese', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: '牡丹育种社会' }),
    ).toBeVisible();
    expect(screen.getByText('基因给你一手牌，选择决定血系的方向。')).toBeVisible();
  });
});
