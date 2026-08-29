import { useEffect, useMemo, useState } from 'react';

import type { PairAssessment } from '../domain/breeding';
import { derivePotential } from '../domain/phenotype';
import { RULESET } from '../domain/rules';
import type { Bird, BirdId, GameState } from '../domain/types';
import { BirdAvatar } from '../rendering/BirdAvatar';

interface PairingLabProps {
  state: GameState;
  generation: 1 | 2;
  onBack: () => void;
  onCompare: (fatherId: BirdId, motherId: BirdId) => Promise<PairAssessment>;
  onBreed: (fatherId: BirdId, motherId: BirdId) => Promise<void>;
  breedingError?: string | null;
}

const compatibilityLabels = {
  high: '高度兼容',
  limited: '有限兼容',
  low: '低兼容',
  incompatible: '不兼容',
};

const relationshipLabels: Record<string, string> = {
  self: '同一个体',
  'parent-child': '亲子',
  'full-siblings': '全同胞',
  'half-siblings': '半同胞',
  grandparent: '祖孙',
  related: '存在共同祖先',
  'unrelated-known': '已知血统内未见近亲',
  'risk-unknown': '祖先资料不足',
};

function ParentChoice({
  bird,
  role,
  selected,
  locked,
  onSelect,
}: {
  bird: Bird;
  role: '父本' | '母本';
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const potential = derivePotential(bird);
  const top = Object.entries(potential.allTraits).sort(([, a], [, b]) => b - a)[0];
  return (
    <button
      className={`parent-choice${selected ? ' is-selected' : ''}`}
      type="button"
      onClick={onSelect}
      aria-label={`选择${role}${bird.status.name}`}
      aria-pressed={selected}
      disabled={locked && !selected}
    >
      <BirdAvatar bird={bird} size="mini" />
      <span className="parent-choice__meta">
        <strong>{bird.status.name}</strong>
        <small>{RULESET.species[bird.speciesAtBirth].label}</small>
        <em>{top ? `${top[0]} ${top[1]}` : '潜力待观察'}</em>
      </span>
      {locked ? <i>已选留鸟</i> : null}
    </button>
  );
}

export function PairingLab({
  state,
  generation,
  onBack,
  onCompare,
  onBreed,
  breedingError,
}: PairingLabProps) {
  const keptBird = state.selectedBirdId ? state.birds[state.selectedBirdId] : undefined;
  const [fatherId, setFatherId] = useState<BirdId | undefined>(
    generation === 2 && keptBird?.sex === 'male' ? keptBird.birdId : undefined,
  );
  const [motherId, setMotherId] = useState<BirdId | undefined>(
    generation === 2 && keptBird?.sex === 'female' ? keptBird.birdId : undefined,
  );
  const [assessment, setAssessment] = useState<PairAssessment | null>(null);
  const [comparing, setComparing] = useState(false);
  const [breeding, setBreeding] = useState(false);

  const candidates = useMemo(
    () =>
      Object.values(state.birds).filter(
        (bird) =>
          bird.status.lifeStage === 'adult' &&
          bird.status.canBreed &&
          bird.status.health !== 'unwell' &&
          bird.status.health !== 'severe' &&
          (generation === 1 || bird.generation === 0 || bird.birdId === keptBird?.birdId),
      ),
    [generation, keptBird?.birdId, state.birds],
  );
  const fathers = candidates.filter((bird) => bird.sex === 'male');
  const mothers = candidates.filter((bird) => bird.sex === 'female');

  useEffect(() => {
    if (!fatherId || !motherId) {
      setAssessment(null);
      return;
    }
    let active = true;
    setComparing(true);
    void onCompare(fatherId, motherId)
      .then((result) => {
        if (active) setAssessment(result);
      })
      .finally(() => {
        if (active) setComparing(false);
      });
    return () => {
      active = false;
    };
  }, [fatherId, motherId, onCompare]);

  async function confirmBreed() {
    if (!fatherId || !motherId || !assessment?.eligible) return;
    setBreeding(true);
    try {
      await onBreed(fatherId, motherId);
    } finally {
      setBreeding(false);
    }
  }

  return (
    <section className="pairing-lab" aria-labelledby="pairing-title">
      <header className="lab-header">
        <button className="back-button" type="button" onClick={onBack}>← 返回鸟舍</button>
        <div>
          <p className="eyebrow">PAIRING LAB · GENERATION {generation}</p>
          <h1 id="pairing-title">{generation === 1 ? '选择第一对父母本' : '为留鸟选择第二代伙伴'}</h1>
          <p className="lede">系统解释风险与可能性，但不会替你选出“最好”的配对。</p>
        </div>
      </header>

      {generation === 2 ? (
        <div className="guidance-strip">
          <strong>第二代原则</strong>
          <span>优先选择没有共同祖先的伙伴；跨物种会带来新的组合，也会降低兼容与稳定度。</span>
        </div>
      ) : null}

      <div className="parent-columns">
        <section>
          <div className="parent-column-title"><span>♂</span><div><small>FATHER</small><h2>父本候选</h2></div></div>
          <div className="parent-list">
            {fathers.map((bird) => (
              <ParentChoice
                key={bird.birdId}
                bird={bird}
                role="父本"
                selected={fatherId === bird.birdId}
                locked={generation === 2 && keptBird?.sex === 'male'}
                onSelect={() => setFatherId(bird.birdId)}
              />
            ))}
          </div>
        </section>
        <div className="pair-symbol" aria-hidden="true">×</div>
        <section>
          <div className="parent-column-title parent-column-title--female"><span>♀</span><div><small>MOTHER</small><h2>母本候选</h2></div></div>
          <div className="parent-list">
            {mothers.map((bird) => (
              <ParentChoice
                key={bird.birdId}
                bird={bird}
                role="母本"
                selected={motherId === bird.birdId}
                locked={generation === 2 && keptBird?.sex === 'female'}
                onSelect={() => setMotherId(bird.birdId)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="assessment-panel" aria-live="polite">
        {!fatherId || !motherId ? (
          <div className="assessment-empty"><span>01 + 01</span><p>选择一只公鸟和一只母鸟后，系统才会展开兼容、血统与健康风险。</p></div>
        ) : comparing ? (
          <p>正在沿血统图查找共同祖先…</p>
        ) : assessment ? (
          <>
            <div className="assessment-head">
              <div><p className="section-kicker">PAIR RECEIPT</p><h2>配对预审</h2></div>
              <span className={`risk-stamp risk-stamp--${assessment.healthRisk}`}>{assessment.healthRisk}</span>
            </div>
            <div className="assessment-facts">
              <div><small>生殖兼容</small><strong>{compatibilityLabels[assessment.compatibility]}</strong></div>
              <div><small>亲缘关系</small><strong>{relationshipLabels[assessment.relationship.category]}</strong></div>
              <div><small>共同健康携带位点</small><strong>{assessment.carrierLoci.length} 个</strong></div>
              <div><small>共同祖先</small><strong>{assessment.relationship.commonAncestors.length} 位</strong></div>
            </div>
            <div className="assessment-detail-grid">
              <div>
                <h3>机会成本</h3>
                <ul className="warning-list">
                  {[...assessment.warnings, ...assessment.blockingReasons].map((item) => (
                    <li key={item.code}><strong>{item.label}</strong><span>{item.detail}</span></li>
                  ))}
                  {assessment.warnings.length + assessment.blockingReasons.length === 0 ? (
                    <li><strong>没有免费优势</strong><span>即使兼容度高，后代仍会重组并损失部分父母优势组合。</span></li>
                  ) : null}
                </ul>
              </div>
              <div>
                <h3>可能出现</h3>
                <div className="possibility-cloud">
                  {assessment.possiblePhenotypes.slice(0, 8).map((item) => (
                    <span key={`${item.trait}-${item.label}`}><small>{item.trait}</small>{item.label}<i>{item.band}</i></span>
                  ))}
                </div>
              </div>
            </div>
            {breedingError ? <p className="inline-error">{breedingError}</p> : null}
            <button
              className="primary-button assessment-submit"
              type="button"
              disabled={!assessment.eligible || breeding}
              onClick={() => void confirmBreed()}
            >
              {breeding ? '正在生成可审计幼鸟…' : '确认繁育'} <span aria-hidden="true">→</span>
            </button>
          </>
        ) : null}
      </section>
    </section>
  );
}
