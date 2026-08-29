import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MemoryGameRepository } from './persistence/repository';
import { App } from './App';

describe('birdhouse and profile', () => {
  it('shows six seed birds and the breeding-first progress path', async () => {
    render(<App repository={new MemoryGameRepository()} />);

    expect(
      await screen.findByRole('heading', { name: '我的牡丹鸟舍' }),
    ).toBeVisible();
    expect(screen.getAllByRole('article', { name: /种鸟/ })).toHaveLength(6);
    expect(screen.getByText('基因给你一手牌，选择决定血系的方向。')).toBeVisible();
    expect(screen.getByRole('button', { name: '进入配对实验室' })).toBeEnabled();
  });

  it('opens a profile without exposing hidden genotype truth', async () => {
    const user = userEvent.setup();
    const repository = new MemoryGameRepository();
    render(<App repository={repository} />);

    await user.click(
      await screen.findByRole('button', { name: '查看晨露档案' }),
    );

    expect(screen.getByRole('dialog', { name: '晨露的档案' })).toBeVisible();
    expect(screen.getByText('尚未检测')).toBeVisible();
    expect(screen.queryByText(/hiddenAllele/)).not.toBeInTheDocument();
    expect((await repository.load())?.interactions).toContainEqual(
      expect.objectContaining({ type: 'profile-viewed', birdId: 'BIRD-M-001' }),
    );
  });
});
