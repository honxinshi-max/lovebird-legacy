import { derivePhenotype, derivePotential } from '../domain/phenotype';
import { RULESET } from '../domain/rules';
import type { Bird } from '../domain/types';
import { BirdAvatar } from '../rendering/BirdAvatar';
import { PedigreePanel } from './PedigreePanel';

interface BirdProfileProps {
  bird: Bird;
  birds: Readonly<Record<string, Bird>>;
  onClose: () => void;
}

const traitLabels: Record<string, string> = {
  speed: '速度', burst: '爆发', endurance: '耐力', agility: '灵活度', recall: '召回潜力', learning: '学习潜力',
  docility: '乖巧', courage: '胆量', stability: '稳定性', alertness: '警觉', affinity: '亲和潜力',
};

export function BirdProfile({ bird, birds, onClose }: BirdProfileProps) {
  const phenotype = derivePhenotype(bird);
  const potential = derivePotential(bird);
  const known = new Set(bird.knownLoci);

  return (
    <div className="modal-backdrop">
      <div
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        <button className="close-button" type="button" onClick={onClose} aria-label="关闭档案">×</button>
        <div className="profile-hero">
          <div className="profile-visual">
            <BirdAvatar bird={bird} size="detail" />
          </div>
          <div className="profile-intro">
            <p className="section-kicker">PERMANENT BIRD RECORD</p>
            <h2 id="profile-title">{bird.status.name}的档案</h2>
            <p className="profile-species">{RULESET.species[bird.speciesAtBirth].label} · {bird.sex === 'male' ? '公鸟' : '母鸟'}</p>
            <dl className="identity-list">
              <div><dt>Bird_ID</dt><dd>{bird.birdId}</dd></div>
              <div><dt>鸟环</dt><dd>{bird.bandId}</dd></div>
              <div><dt>出生日期</dt><dd>{bird.birthDate}</dd></div>
              <div><dt>规则版本</dt><dd>{bird.rulesetVersion}</dd></div>
            </dl>
          </div>
        </div>

        <div className="profile-columns">
          <section className="profile-section">
            <p className="section-kicker">OBSERVED</p>
            <h3>已知表型</h3>
            <div className="tag-cloud">
              <span>{phenotype.bodyColorToken}</span>
              <span>{phenotype.faceColorToken}</span>
              <span>{phenotype.pattern}</span>
              <span>{phenotype.faceShape}</span>
              <span>{phenotype.eyeColorToken}</span>
            </div>
          </section>
          <section className="profile-section">
            <p className="section-kicker">TESTED</p>
            <h3>检测结果</h3>
            <ul className="gene-list">
              {(Object.keys(RULESET.loci) as Array<keyof typeof RULESET.loci>)
                .filter((id) => known.has(id))
                .map((id) => (
                  <li key={id}>
                    <span>{RULESET.loci[id].label}</span>
                    <strong>
                      {Object.values(bird.genome.loci[id])
                        .map((copy) => RULESET.loci[id].alleles[copy.allele]?.label)
                        .join(' / ')}
                    </strong>
                  </li>
                ))}
            </ul>
          </section>
          <section className="profile-section profile-section--unknown">
            <p className="section-kicker">UNKNOWN</p>
            <h3>尚未检测</h3>
            <p>{Object.keys(RULESET.loci).length - bird.knownLoci.length} 个位点仍保持未知。未知不等于没有风险，也可能藏着下一代的惊喜。</p>
          </section>
        </div>

        <section className="potential-section">
          <div className="section-heading-row">
            <div><p className="section-kicker">POTENTIAL, NOT SCORE</p><h3>潜力与机会成本</h3></div>
            <span className="data-chip">不合成总分</span>
          </div>
          <div className="potential-grid">
            {Object.entries(potential.allTraits).map(([trait, value]) => (
              <div className="potential-row" key={trait}>
                <span>{traitLabels[trait]}</span>
                <div className="potential-track"><i style={{ width: `${value}%` }} /></div>
                <strong>{potential.bands[trait as keyof typeof potential.bands]}</strong>
              </div>
            ))}
          </div>
          <div className="tradeoff-list">
            {potential.tradeOffs.map((item) => (
              <article key={item.axis}><span>取舍</span><strong>{item.source}</strong><p>{item.text}</p></article>
            ))}
          </div>
        </section>

        <PedigreePanel bird={bird} birds={birds} />
      </div>
    </div>
  );
}
