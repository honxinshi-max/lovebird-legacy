import { useState } from 'react';

import type { BreedReceipt } from '../application/game';
import { derivePhenotype, derivePotential } from '../domain/phenotype';
import type { Bird, BirdId, GameState, ValueRoute } from '../domain/types';
import { BirdAvatar } from '../rendering/BirdAvatar';

interface BirthRevealProps {
  state: GameState;
  receipt: Extract<BreedReceipt, { ok: true }>;
  onOpenExplanation: (birdId: BirdId) => Promise<void>;
  onKeep: (birdId: BirdId, route: ValueRoute, reason: string) => Promise<void>;
}

const routeOptions: readonly { value: ValueRoute; label: string }[] = [
  { value: 'competition', label: '竞技方向' },
  { value: 'appearance', label: '外貌方向' },
  { value: 'affinity', label: '亲和方向' },
  { value: 'healthy-population', label: '健康种群' },
  { value: 'rare-gene', label: '稀有基因保留' },
];

export function BirthReveal({ state, receipt, onOpenExplanation, onKeep }: BirthRevealProps) {
  const chicks = receipt.chickIds.map((id) => state.birds[id]).filter((bird): bird is Bird => Boolean(bird));
  const [expanded, setExpanded] = useState<BirdId | null>(null);
  const [selected, setSelected] = useState<BirdId | null>(null);
  const [route, setRoute] = useState<ValueRoute>('rare-gene');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function openExplanation(birdId: BirdId) {
    setExpanded(expanded === birdId ? null : birdId);
    if (expanded !== birdId) await onOpenExplanation(birdId);
  }

  async function keep() {
    if (!selected || reason.trim().length < 4) return;
    setSaving(true);
    try {
      await onKeep(selected, route, reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="birth-reveal" aria-labelledby="birth-title">
      <header className="reveal-header">
        <p className="eyebrow">CLUTCH {receipt.breedingEventId}</p>
        <h1 id="birth-title">同一对父母，三种不同答案</h1>
        <p className="lede">重组没有抹去来源。每个差异都能回到父本、母本或明确记录的突变。</p>
      </header>

      <div className="chick-grid">
        {chicks.map((chick, index) => {
          const potential = derivePotential(chick);
          const phenotype = derivePhenotype(chick);
          const topTraits = Object.entries(potential.allTraits).sort(([, a], [, b]) => b - a).slice(0, 3);
          const explanations = receipt.explanations[index] ?? [];
          return (
            <article className={`chick-card${selected === chick.birdId ? ' is-selected' : ''}`} aria-label={`${chick.status.name}幼鸟`} key={chick.birdId}>
              <div className="chick-card__visual">
                <span className="chick-number">0{index + 1}</span>
                <BirdAvatar bird={chick} size="reveal" />
              </div>
              <div className="chick-card__body">
                <div className="chick-title"><div><small>{chick.sex === 'male' ? '♂ 公幼鸟' : '♀ 母幼鸟'}</small><h2>{chick.status.name}</h2></div><span>{chick.bandId}</span></div>
                <div className="ancestry-bar" aria-label="祖源组成">
                  {Object.entries(chick.ancestryComposition).filter(([, value]) => value > 0).map(([species, value]) => (
                    <span key={species} style={{ width: `${value}%` }} title={`${species} ${value}%`} />
                  ))}
                </div>
                <div className="chick-traits">
                  {topTraits.map(([trait, value]) => <span key={trait}><small>{trait}</small><strong>{value}</strong></span>)}
                </div>
                <p className="phenotype-line">{phenotype.bodyColorToken} · {phenotype.faceColorToken} · {phenotype.pattern}</p>
                <button className="explain-button" type="button" onClick={() => void openExplanation(chick.birdId)} aria-expanded={expanded === chick.birdId}>
                  查看幼鸟 {index + 1} 遗传解释 <span aria-hidden="true">{expanded === chick.birdId ? '−' : '+'}</span>
                </button>
                {expanded === chick.birdId ? (
                  <ol className="explanation-list">
                    {explanations.slice(0, 6).map((item) => <li key={item.locusId}><strong>{item.label}</strong><span>{item.text}</span></li>)}
                  </ol>
                ) : null}
                <button className="keep-button" type="button" onClick={() => setSelected(chick.birdId)} aria-pressed={selected === chick.birdId}>
                  选择幼鸟 {index + 1} 作为留鸟
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selected ? (
        <section className="keep-form" aria-labelledby="keep-title">
          <div><p className="section-kicker">YOUR DIRECTION</p><h2 id="keep-title">价值不是系统替你算出来的</h2><p>为留鸟说明方向。这一选择会进入它的永久经历，但不会修改基因。</p></div>
          <div className="keep-fields">
            <label>留鸟方向<select aria-label="留鸟方向" value={route} onChange={(event) => setRoute(event.target.value as ValueRoute)}>{routeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label>留鸟理由<textarea aria-label="留鸟理由" value={reason} onChange={(event) => setReason(event.target.value)} minLength={4} maxLength={80} placeholder="例如：保留浅色眼携带组合" /></label>
            <button className="primary-button" type="button" disabled={saving || reason.trim().length < 4} onClick={() => void keep()}>{saving ? '正在写入永久记录…' : '确认留鸟方向'} <span aria-hidden="true">→</span></button>
          </div>
        </section>
      ) : null}
    </section>
  );
}

export function KeptBirdTransition({ bird, onContinue }: { bird: Bird; onContinue: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="transition-panel">
      <div className="transition-bird"><BirdAvatar bird={bird} size="detail" /></div>
      <div>
        <p className="eyebrow">GENERATION ONE · KEPT</p>
        <h1>准备第二代</h1>
        <p className="lede">你因为“{bird.status.keepReason}”留下了{bird.status.name}。演示会推进到成年，但不会假装已经模拟完整养育过程。</p>
        <dl className="transition-record"><div><dt>候选方向</dt><dd>{bird.status.valueRoute}</dd></div><div><dt>DNA</dt><dd>保持不变</dd></div><div><dt>历史</dt><dd>已写入</dd></div></dl>
        <button className="primary-button" type="button" disabled={busy} onClick={() => { setBusy(true); void onContinue().finally(() => setBusy(false)); }}>{busy ? '正在推进演示年龄…' : '推进到成年并选择伙伴'} <span aria-hidden="true">→</span></button>
      </div>
    </section>
  );
}
