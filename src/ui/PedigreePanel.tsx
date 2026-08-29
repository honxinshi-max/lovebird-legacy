import type { Bird } from '../domain/types';

interface PedigreePanelProps {
  bird: Bird;
  birds: Readonly<Record<string, Bird>>;
}

function ancestorName(id: string | undefined, birds: Readonly<Record<string, Bird>>) {
  return id ? birds[id]?.status.name ?? '资料缺失' : '基础种鸟';
}

export function PedigreePanel({ bird, birds }: PedigreePanelProps) {
  const father = bird.fatherId ? birds[bird.fatherId] : undefined;
  const mother = bird.motherId ? birds[bird.motherId] : undefined;

  return (
    <section className="pedigree-panel" aria-labelledby="pedigree-title">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">PEDIGREE</p>
          <h3 id="pedigree-title">四代血统窗口</h3>
        </div>
        <span className="data-chip">完整记录保留于数据层</span>
      </div>
      <div className="pedigree-tree">
        <div className="pedigree-node pedigree-node--current">
          <span>当前个体</span>
          <strong>{bird.status.name}</strong>
        </div>
        <div className="pedigree-branch">
          <div className="pedigree-node">
            <span>父亲</span>
            <strong>{ancestorName(bird.fatherId, birds)}</strong>
          </div>
          <div className="ancestor-pair">
            <small>{ancestorName(father?.fatherId, birds)}</small>
            <small>{ancestorName(father?.motherId, birds)}</small>
          </div>
        </div>
        <div className="pedigree-branch">
          <div className="pedigree-node">
            <span>母亲</span>
            <strong>{ancestorName(bird.motherId, birds)}</strong>
          </div>
          <div className="ancestor-pair">
            <small>{ancestorName(mother?.fatherId, birds)}</small>
            <small>{ancestorName(mother?.motherId, birds)}</small>
          </div>
        </div>
      </div>
    </section>
  );
}
