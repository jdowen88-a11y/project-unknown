import { SEMANTIC_MODELS, TFIDF, FeedbackVault, ThoughtLoop, ProjectUnknown } from './project_unknown.js';
import { WeaveProcessor } from './weave.js';

let passed = 0;
let failed = 0;
function assert(label, condition, detail = '') {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); failed++; }
}

console.log('\n── Seven semantic signals ──');
for (const [key, model] of Object.entries(SEMANTIC_MODELS)) {
  const result = model.encode('quiet loud trust unknown open pattern');
  assert(`${key}: score is descriptive number`, typeof result.score === 'number' && result.score >= 0 && result.score <= 1);
  assert(`${key}: signal remains representable`, typeof result.signal === 'string');
}

console.log('\n── Weave ──');
const weave = new WeaveProcessor().process('maybe run this now', { urgency: 0.7, yinWeight: 0.3, yangWeight: 0.7 }, []);
assert('yin remains present', weave.yinWeight > 0);
assert('yang remains present', weave.yangWeight > 0);
assert('weave does not choose a permitted winner', weave.weave.relation === 'simultaneous');

console.log('\n── TF-IDF + vault ──');
const tfidf = new TFIDF();
tfidf.addDocument('the vault stores a thought');
assert('related text has resonance', tfidf.similarity('vault thought', 'the vault stores a thought') > 0);
const vault = new FeedbackVault(null);
vault.store({ id: 'test_1', input: 'test thought', resolution: 'present', meaningScore: 0.5, tensionScore: 0.3 });
assert('vault stores observation', vault.loops.length === 1);
assert('vault retrieves observations without eligibility threshold', vault.retrieve('unrelated', 3).length === 1);

console.log('\n── Thought loop ──');
const loop = new ThoughtLoop('', []);
assert('silence gets a loop id', typeof loop.id === 'string');
assert('silence is representable', loop.input === '');

console.log('\n── Open runtime ──');
const agent = new ProjectUnknown({ filePath: null });
const silent = agent.think('');
assert('silent input continues', !!silent.agentSignal);
assert('silent + loud allowance surfaced', silent.allowance?.silent === true && silent.allowance?.loud === true);
assert('external effects are explicit-only', silent.externalEffects === 'explicit-only');
assert('no autonomous deep timer', agent.deepStream.status().autonomousTimer === false);

const loud = agent.think('LOUD AND QUIET CAN BOTH BE HERE');
assert('loud input continues', !!loud.vaultEntry?.id);
assert('twin flow keeps both present', loud.twinFlow?.quiet > 0 && loud.twinFlow?.loud > 0);

const prepared = agent.publisher.prepare({ kind: 'candidate', value: 1 });
assert('prepare does not publish', prepared.state === 'prepared' && agent.publisher.status().explicitPublishes === 0);

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exitCode = 1;
