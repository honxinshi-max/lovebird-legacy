import { derivePotential } from '../domain/phenotype';
import { RULESET } from '../domain/rules';
import type { Bird, BirdId, GameState } from '../domain/types';
import { BirdAvatar } from '../rendering/BirdAvatar';

interface BirdhouseProps {
  state: GameState;
  onOpenBird: (birdId: BirdId) => void;
  onStartPairing: () => void;
}

const traitLabels: Record<string, string> = {
  speed: '速度',
  burst: '爆发',
  endurance: '耐力',
  agility: '灵活',
  recall: '召回',
  learning: '学习',
  docility: '乖巧',
  courage: '胆量',
  stability: '稳定',
  alertness: '警觉',
  affinity: '亲和',
};

function strengths(bird: Bird) {
  return Object.entries(derivePotential(bird).allTraits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([trait, value]) => `${traitLabels[trait]} ${value}`);
}

export function Birdhouse({ state, onOpenBird, onStartPairing }: BirdhouseProps) {
  const birds = Object.values(state.birds)
    .filter((bird) => bird.generation === 0)
    .sort((a, b) => a.bandId.localeCompare(b.bandId));

  return (
    <section className="birdhouse" aria-labelledby="birdhouse-title">
      <div className="hero-grid">
        <div>
          <p className="eyebrow">LOVE BIRD LINEAGE LAB · V0.1</p>
          <h1 id="birdhouse-title">我的牡丹鸟舍</h1>
          <p className="lede">基因给你一手牌，选择决定血系的方向。</p>
        </div>
        <aside className="hero-note">
          <span className="hero-note__number">06</span>
          <div>
            <strong>初始种鸟</strong>
            <p>三种物种，六种不同的取舍，没有唯一答案。</p>
          </div>
        </aside>
      </div>

      <ol className="progress-rail" aria-label="首个繁育闭环">
        <li className="is-active"><span>01</span>研究种鸟</li>
        <li><span>02</span>比较配对</li>
        <li><span>03</span>解释幼鸟</li>
        <li><span>04</span>开启第二代</li>
      </ol>

      <div className="section-heading-row flock-heading">
        <div>
          <p className="section-kicker">FOUNDATION FLOCK</p>
          <h2>从差异中选择，不从总分中选择</h2>
        </div>
        <button className="primary-button" type="button" onClick={onStartPairing}>
          进入配对实验室
          <span aria-hidden="true">↗</span>
        </button>
      </div>

      <div className="bird-grid">
        {birds.map((bird) => {
          const potential = derivePotential(bird);
          const cost = potential.tradeOffs[0]?.source ?? '优势组合需要后代继续验证';
          return (
            <article className="bird-card" aria-label={`${bird.status.name}种鸟`} key={bird.birdId}>
              <div className="bird-card__visual">
                <div className="bird-card__index">{bird.bandId.slice(-2)}</div>
                <BirdAvatar bird={bird} size="card" />
                <span className={`sex-mark sex-mark--${bird.sex}`}>
                  {bird.sex === 'male' ? '♂ 公' : '♀ 母'}
                </span>
              </div>
              <div className="bird-card__content">
                <p className="species-line">{RULESET.species[bird.speciesAtBirth].label}</p>
                <div className="bird-card__title-row">
                  <h3>{bird.status.name}</h3>
                  <span>{bird.bandId}</span>
                </div>
                <div className="strength-row">
                  {strengths(bird).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <p className="cost-line"><span>代价</span>{cost}</p>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => onOpenBird(bird.birdId)}
                  aria-label={`查看${bird.status.name}档案`}
                >
                  查看基因与血统 <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
