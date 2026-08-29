import type { GameState } from '../domain/types';
import { BirdAvatar } from '../rendering/BirdAvatar';

export function CompletionPanel({ state, onReturn }: { state: GameState; onReturn: () => void }) {
  const last = state.breedingEvents.at(-1);
  const chicks = last?.childIds.map((id) => state.birds[id]).filter(Boolean) ?? [];
  const counts = state.interactions.reduce<Record<string, number>>((result, event) => {
    result[event.type] = (result[event.type] ?? 0) + 1;
    return result;
  }, {});
  return (
    <section className="completion-panel">
      <div className="completion-copy">
        <p className="eyebrow">VERTICAL SLICE COMPLETE</p>
        <h1>你的第一条血系已经开始</h1>
        <p className="lede">这不是官方新品种，也不是一个总分纪录。它是一条拥有来源、选择理由和第二代后裔的可追溯血系。</p>
        <div className="completion-stats"><div><strong>{Object.keys(state.birds).length}</strong><span>记录个体</span></div><div><strong>2</strong><span>完成代数</span></div><div><strong>{state.events.length}</strong><span>历史事件</span></div></div>
        <button className="primary-button" type="button" onClick={onReturn}>返回完整鸟舍 <span aria-hidden="true">→</span></button>
      </div>
      <div className="completion-lineage">
        {chicks.map((bird) => <article key={bird.birdId}><BirdAvatar bird={bird} size="mini" /><strong>{bird.status.name}</strong><span>{bird.bandId}</span></article>)}
        <aside><p className="section-kicker">LOCAL FEEDBACK</p><h2>仅保存在本设备</h2><ul>{Object.entries(counts).map(([type, count]) => <li key={type}><span>{type}</span><strong>{count}</strong></li>)}</ul></aside>
      </div>
    </section>
  );
}
