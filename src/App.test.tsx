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

  it('completes a first clutch and records a non-score keep reason', async () => {
    const user = userEvent.setup();
    render(<App repository={new MemoryGameRepository()} />);

    await user.click(
      await screen.findByRole('button', { name: '进入配对实验室' }),
    );
    await user.click(screen.getByRole('button', { name: '选择父本湖蓝' }));
    await user.click(screen.getByRole('button', { name: '选择母本青柠' }));

    expect(await screen.findByText('机会成本')).toBeVisible();
    expect(screen.queryByText(/综合战力|最佳配对/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认繁育' }));

    expect(await screen.findAllByRole('article', { name: /幼鸟/ })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '选择幼鸟 1 作为留鸟' }));
    await user.selectOptions(screen.getByLabelText('留鸟方向'), 'rare-gene');
    await user.type(screen.getByLabelText('留鸟理由'), '保留浅色眼携带组合');
    await user.click(screen.getByRole('button', { name: '确认留鸟方向' }));

    expect(await screen.findByText('准备第二代')).toBeVisible();
  });

  it('uses an unrelated cross-species partner to complete generation two', async () => {
    const user = userEvent.setup();
    render(<App repository={new MemoryGameRepository()} />);
    await user.click(
      await screen.findByRole('button', { name: '进入配对实验室' }),
    );
    await user.click(screen.getByRole('button', { name: '选择父本湖蓝' }));
    await user.click(screen.getByRole('button', { name: '选择母本青柠' }));
    await user.click(await screen.findByRole('button', { name: '确认繁育' }));
    await user.click(
      (await screen.findAllByRole('button', { name: /作为留鸟/ }))[0] as HTMLElement,
    );
    await user.selectOptions(screen.getByLabelText('留鸟方向'), 'appearance');
    await user.type(screen.getByLabelText('留鸟理由'), '保留水绿色系与灵活潜力');
    await user.click(screen.getByRole('button', { name: '确认留鸟方向' }));
    await user.click(
      await screen.findByRole('button', { name: '推进到成年并选择伙伴' }),
    );

    const maskedCandidates = [
      await screen.findByRole('button', { name: '选择母本银铃' }),
      screen.getByRole('button', { name: '选择父本墨羽' }),
    ];
    const availableMaskedPartner = maskedCandidates.find(
      (candidate) => !candidate.hasAttribute('disabled'),
    );
    if (!availableMaskedPartner) throw new Error('Expected an available masked partner');
    await user.click(availableMaskedPartner);
    expect((await screen.findAllByText('有限兼容')).length).toBeGreaterThan(0);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const confirm = screen.queryByRole('button', { name: '确认繁育' });
      if (!confirm) break;
      await user.click(confirm);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(
      await screen.findByRole('heading', { name: '你的第一条血系已经开始' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: '仅保存在本设备' })).toBeVisible();
  });
});
