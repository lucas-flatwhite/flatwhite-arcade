import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dataSource = readFileSync(
  resolve(process.cwd(), 'src/snake/data.ts'),
  'utf8',
);

describe('experience data source contract', () => {
  it('defines the one-screen text field content model', () => {
    expect(dataSource).toContain('backgroundWordPool');
    expect(dataSource).toContain('burstPhrasePoolKo');
    expect(dataSource).toContain('burstPhrasePoolEn');
    expect(dataSource).toContain('playfieldConfig');
    expect(dataSource).toContain('backgroundWordCount: 1080');
    expect(dataSource).toContain('maxSpeed: 12');
    expect(dataSource).toContain('speedRampEvery: 4');
    expect(dataSource).toContain('cpuRespawnMs: 2600');
    expect(dataSource).toContain('burstLockMs: 0');
    expect(dataSource).toContain('comboWindowMs: 4200');
    expect(dataSource).toContain('specialFoodSpawnEvery: 3');
    expect(dataSource).toContain('cpuSlowDurationMs: 4000');
    expect(dataSource).toContain('cpuKillBonusGrowth: 3');
    expect(dataSource).toContain('rivalDefeatPhrasePool');
    expect(dataSource).toContain('pulseRadius: 320');
    expect(dataSource).toContain("'handoff'");
    expect(dataSource).toContain("'rollback'");
    expect(dataSource).toContain("'wireframe'");
    expect(dataSource).toContain("'로드맵'");
    expect(dataSource).toContain("'배포'");
    expect(dataSource).toContain("'Keith\\u00A0Haring'");
    expect(dataSource).toContain("'Martin\\u00A0Garrix'");
    expect(dataSource).toContain("'키스\\u00A0해링'");
    expect(dataSource).toContain("'마틴\\u00A0개릭스'");
    expect(dataSource).toContain("'npm install은 끝났는데 문제는 방금 시작됐다'");
    expect(dataSource).toContain("'백엔드는 200을 줬고 프론트는 영혼을 잃었다'");
    expect(dataSource).toContain("'git stash에 넣어둔 용기가 아직 checkout되지 않았다'");
    expect(dataSource).toContain("'LLM은 자신만만했고 로그는 점점 시적이 됐다'");
    expect(dataSource).toContain("'the build passed and the bug updated its linkedin'");
    expect(dataSource).toContain("'frontend shipped pixels and backend shipped character development'");
    expect(dataSource).toContain("'git said already up to date and my anxiety opened a new branch'");
    expect(dataSource).toContain("'the ai wrote the draft and the human wrote the apology'");
    expect(dataSource).not.toContain("'한 모금의 열기가 화면 바깥까지 번져나간다'");
    expect(dataSource).not.toContain("'잔물결'");
  });
});
