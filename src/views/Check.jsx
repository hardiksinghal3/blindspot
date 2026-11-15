import { CountUp } from '../ui/motion.jsx';
import { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { Link } from '@astryxdesign/core/Link';
import { Tag } from '../ui/Status.jsx';
import { Slider } from '@astryxdesign/core/Slider';
import { Stepper, Step } from '@astryxdesign/core/Stepper';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { ToggleButtonGroup, ToggleButton } from '@astryxdesign/core/ToggleButton';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { addCheck, addVitals, getState } from '../lib/store.js';
import { gapLabel, MIN_BASELINE } from '../lib/scoring.js';
import { formatDelay, isoDate } from '../lib/mission.js';
import { useApp, go } from '../app/AppContext.jsx';
import { Status } from '../ui/Status.jsx';
import { GapBar, signed } from '../ui/graphics.jsx';
import { Legend, RuleItem, PageIntro, READ_WIDTH } from '../ui/parts.jsx';
import Pvt from '../tests/Pvt.jsx';
import Motor from '../tests/Motor.jsx';
import Vision from '../tests/Vision.jsx';
import Pulse from '../tests/Pulse.jsx';

const TESTS = {
  pvt: { name: 'Alertness', what: 'Reaction test', time: '1 or 3 min', tag: 'Flown on ISS as Reaction Self-Test', system: 'brain', ask: 'How alert are you right now?', needs: 'Keyboard or touch' },
  vision: { name: 'Vision', what: 'Near acuity and grid, each eye', time: '2 min', tag: 'Modelled on ISS vision checks', system: 'eyes', ask: 'How well are you seeing right now?', needs: 'A bank card, once, to size the screen' },
  motor: { name: 'Hands', what: 'Pointing test', time: '30 s', tag: 'Modelled on NASA Fine Motor Skills', system: 'hands', ask: 'How quick and steady are your hands right now?', needs: 'Mouse, trackpad or touch' },
  pulse: { name: 'Pulse', what: 'Tap along or camera', time: '30 s', tag: 'Screening grade', system: 'heart', ask: null, needs: 'Nothing, or a camera' },
};
const MARKS = [{ value: 0, label: '0 far below my normal' }, { value: 50, label: '50 my normal' }, { value: 100, label: '100 my best' }];

function HubCard({ href, title, what, note, done, time, isDisabled }) {
  return (
    <ClickableCard label={title} href={href} isDisabled={isDisabled}>
      <VStack gap={2}>
        <HStack hAlign="between" vAlign="center">
          <Heading level={3}>{title}</Heading>
          {done ? <Tag label="Done today" /> : <Tag label={time} />}
        </HStack>
        <Text as="p" color="secondary">{what}</Text>
        <Text as="p" type="supporting">{note}</Text>
      </VStack>
    </ClickableCard>
  );
}

function Hub() {
  const { state, now } = useApp();
  const done = (t) => state.checks.some((c) => c.type === t && isoDate(c.t) === isoDate(now));
  const vitalsDone = state.vitals.some((v) => isoDate(v.t) === isoDate(now));
  return (
    <>
      <PageIntro title="Daily check">For each test you first call your result, then the device measures it. Start with Alertness: it takes a minute and shows the whole idea.</PageIntro>
      {!getState().settings.onboarded && <Banner status="info" title="You are on the default mission: Mars, day 1" endContent={<Button label="Set up your mission" size="sm" href="#/setup" />} />}
      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
        {Object.entries(TESTS).map(([id, t]) => <HubCard key={id} href={`#/check/${id}`} title={t.name} what={t.what} note={`${t.tag} · ${t.needs}`} done={done(id)} time={t.time} />)}
        <HubCard href="#/check/vitals" title="Readings" what="Sleep, mood, temperature, blood pressure, blood sugar, oxygen, exercise, cabin air" note="Typed in from your devices" done={vitalsDone} time="1 min" />
        <HubCard title="Balance" what="Standing sway and sit-to-stand for surface stays and landing day" note="Not built yet. Balance tests do not apply in weightlessness." time="Planned" isDisabled />
      </Grid>
    </>
  );
}

function resultOf(type, r) {
  if (type === 'pvt') {
    const m = r.metrics;
    if (m.n < 5) return { invalid: 'Not enough responses to score. The test needs at least 5.' };
    return {
      values: { pvt_speed: +m.speed.toFixed(3), pvt_lapses: m.lapses }, detail: { medianRt: Math.round(m.medianRt), falseStarts: m.falseStarts, n: m.n, seconds: r.seconds },
      lines: [['Median reaction time', `${Math.round(m.medianRt)} ms`], ['Response speed', `${m.speed.toFixed(2)} per second`], ['Lapses (355 ms or slower)', m.lapses], ['False starts', m.falseStarts], ['Responses', m.n]],
    };
  }
  if (type === 'motor') {
    const m = r.metrics;
    if (!(m.n >= 10)) return { invalid: 'Not enough taps to score.' };
    return {
      values: { motor_tp: +m.throughput.toFixed(2) }, detail: { errorRate: m.errorRate, meanTime: Math.round(m.meanTime) },
      lines: [['Throughput', `${m.throughput.toFixed(2)} bits per second`], ['Missed targets', `${Math.round(m.errorRate * 100)} %`], ['Mean time per target', `${Math.round(m.meanTime)} ms`]],
    };
  }
  if (type === 'vision') {
    const f = (v) => (v > 1 ? 'worse than 1.0' : `${v.toFixed(2)}${v <= r.floor ? ' (smallest this screen can draw)' : ''}`);
    return {
      values: { acuity: Math.max(r.right, r.left) }, detail: { right: r.right, left: r.left, floor: r.floor, amsler: r.amsler },
      lines: [['Right eye, logMAR', f(r.right)], ['Left eye, logMAR', f(r.left)], ['Grid squares marked', r.amsler]],
    };
  }
  return {
    values: { pulse: r.bpm }, detail: { method: r.method, quality: +r.quality.toFixed(2) },
    lines: [['Resting pulse', `${r.bpm} beats per minute`], ['Method', r.method === 'tap' ? 'Tapped along' : 'Camera'], [r.method === 'tap' ? 'Tap regularity' : 'Signal quality', `${Math.round(r.quality * 100)} %`]],
  };
}

function Predict({ type, t, quick, setQuick, onLock }) {
  const [value, setValue] = useState(50);
  const [touched, setTouched] = useState(false);
  return (
    <Card padding={6}>
      <VStack gap={5} onPointerDown={() => setTouched(true)} onKeyDown={() => setTouched(true)}>
        <VStack gap={2}>
          <Heading level={2}>{t.ask}</Heading>
          <Text as="p" color="secondary">Commit before you test. 50 is your normal. Move the slider, even if only to confirm 50.</Text>
        </VStack>
        <Heading level={2} type="display-2" accessibilityLevel={3} color="accent">{value}</Heading>
        <Slider label={t.ask} isLabelHidden valueDisplay="none" value={value} min={0} max={100} step={1} marks={MARKS} onChange={(v) => { setValue(v); setTouched(true); }} />
        {type === 'pvt' && (
          <VStack gap={2}>
            <SegmentedControl label="Test length" value={quick ? 'quick' : 'standard'} onChange={(v) => setQuick(v === 'quick')}>
              <SegmentedControlItem value="quick" label="Quick, 60 s" />
              <SegmentedControlItem value="standard" label="Standard, 3 min" />
            </SegmentedControl>
            <Text type="supporting">{quick ? 'Quick is demo grade.' : 'Standard is the length of the PVT-B.'}</Text>
          </VStack>
        )}
        <HStack gap={3}>
          <Button label="Lock in my call" variant="primary" size="lg" isDisabled={!touched} onClick={() => onLock(value)} />
          <Button label="Cancel" variant="ghost" size="lg" href="#/check" />
        </HStack>
      </VStack>
    </Card>
  );
}

function Reveal({ type, t, felt, quick, lines }) {
  const { d } = useApp();
  const m = d.metrics[type];
  if (!m) return null;
  const p = m.last;
  const findings = d.result.systems[t.system].findings.filter((f) => f.status !== 'go');
  const lt = d.lt;
  const reply = lt ? (lt.blackout ? 'Earth is out of contact. This call is yours.' : `Earth's reply would take at least ${formatDelay(lt.seconds * 2)}. This call is yours.`) : '';
  const baseNote = m.base.provisional ? `Scored against a provisional reference. Your personal baseline starts after ${MIN_BASELINE} checks (you have ${m.base.n}).` : `Scored against your own baseline from your first ${m.base.n} checks.`;
  const st = p.unaware ? 'nogo' : p.status;
  return (
    <>
      <Card padding={6}>
        {p.gap != null ? (
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center"><Text type="label">Insight Gap</Text><Status status={p.status} /></HStack>
            <HStack gap={6} vAlign="end" wrap="wrap">
              <Heading level={2} type="display-1" accessibilityLevel={3}><CountUp value={p.gap} format={(n) => signed(Math.round(n))} /></Heading>
              <VStack gap={0} paddingBlockEnd={2}>
                <Text type="large" weight="semibold">{p.unaware ? 'Impaired and unaware' : gapLabel(p.gap)}</Text>
                <Text color="secondary">You called {felt}. You measured {p.score}.</Text>
              </VStack>
            </HStack>
            <GapBar felt={felt} measured={p.score} status={st} />
            <Legend />
            <Text as="p" type="supporting">{baseNote}{type === 'pvt' && quick ? ' Quick mode is demo grade; the standard test is 3 minutes.' : ''}</Text>
          </VStack>
        ) : (
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center"><Text type="label">{m.base.forming ? `Baseline reading ${m.base.n} of ${MIN_BASELINE}` : 'Result'}</Text><Status status={p.status} /></HStack>
            <Heading level={2} type="display-2" accessibilityLevel={3}>{p.value.toFixed(m.def.digits)} {m.def.unit}</Heading>
            <Text as="p" type="supporting">{m.base.forming ? `This result depends on your screen or pointing device, so it is not judged against anyone else. It becomes part of your own baseline, and the Insight Gap for this test starts after ${MIN_BASELINE} readings.${felt != null ? ` Your call of ${felt} is saved.` : ''}` : baseNote}</Text>
          </VStack>
        )}
      </Card>
      {findings.length ? (
        <>
          {findings.map((f) => <Card key={f.rule.id}><RuleItem rule={f.rule} finding={f} /></Card>)}
          <Banner status="warning" title={reply} />
        </>
      ) : <Text as="p" color="secondary">No rule fired for this system.</Text>}
      <Divider />
      <MetadataList>{lines.map(([k, v]) => <MetadataListItem key={k} label={k}>{v}</MetadataListItem>)}</MetadataList>
      <HStack gap={3} wrap="wrap">
        <Button label="See today" variant="primary" size="lg" href="#/today" />
        <Button label="Next check" size="lg" href="#/check" />
        <Button label="Trends" variant="ghost" size="lg" href="#/trends" />
      </HStack>
    </>
  );
}

function Flow({ type }) {
  const t = TESTS[type];
  const [phase, setPhase] = useState(t.ask ? 'predict' : 'test');
  const [felt, setFelt] = useState(null);
  const [quick, setQuick] = useState(true);
  const [out, setOut] = useState(null);
  const finish = (r) => {
    const res = resultOf(type, r);
    if (res.invalid) { setOut(res); return setPhase('invalid'); }
    addCheck({ type, felt, values: res.values, detail: res.detail, quick: type === 'pvt' ? quick : undefined });
    setOut(res); setPhase('reveal');
    window.scrollTo(0, 0);
  };
  const step = phase === 'predict' ? 0 : phase === 'reveal' ? 2 : 1;
  return (
    <VStack gap={5} maxWidth={820} width="100%">
      <HStack hAlign="between" vAlign="end" gap={4} wrap="wrap">
        <VStack gap={1}><Text type="supporting">{t.what}</Text><Heading level={1}>{t.name}</Heading></VStack>
        {t.ask && (
          <Stepper activeStep={step} label="Check steps" density="compact">
            <Step step={0} label="Call it" /><Step step={1} label="Test it" /><Step step={2} label="See the gap" />
          </Stepper>
        )}
      </HStack>
      {phase === 'predict' && <Predict type={type} t={t} quick={quick} setQuick={setQuick} onLock={(v) => { setFelt(v); setPhase('test'); }} />}
      {phase === 'test' && type === 'pvt' && <Pvt seconds={quick ? 60 : 180} onDone={finish} />}
      {phase === 'test' && type === 'motor' && <Motor onDone={finish} />}
      {phase === 'test' && type === 'vision' && <Vision onDone={finish} />}
      {phase === 'test' && type === 'pulse' && <Pulse onDone={finish} />}
      {phase === 'invalid' && (
        <Card padding={5}>
          <VStack gap={3}>
            <Heading level={3}>No result</Heading>
            <Text as="p" color="secondary">{out.invalid} Nothing was saved.</Text>
            <HStack gap={3}><Button label="Try again" variant="primary" onClick={() => setPhase(t.ask ? 'predict' : 'test')} /><Button label="Back" variant="ghost" href="#/check" /></HStack>
          </VStack>
        </Card>
      )}
      {phase === 'reveal' && <Reveal type={type} t={t} felt={felt} quick={quick} lines={out.lines} />}
    </VStack>
  );
}

const FIELDS = [
  ['sleep', 'Sleep last night', 'h', 0, 16, 0.1], ['temp', 'Body temperature', '°C', 33, 42, 0.1], ['sys', 'Blood pressure, upper', 'mmHg', 60, 260, 1], ['dia', 'Blood pressure, lower', 'mmHg', 30, 160, 1],
  ['pulse', 'Resting pulse', 'bpm', 30, 220, 1], ['spo2', 'Blood oxygen', '%', 60, 100, 1], ['glucose', 'Blood sugar', 'mg/dL', 20, 600, 1], ['exercise', 'Prescribed exercise done today', '%', 0, 100, 1], ['co2', 'Cabin carbon dioxide', 'mmHg', 0, 20, 0.1],
];

function Vitals() {
  const [vals, setVals] = useState({});
  const [mood, setMood] = useState(null);
  const [err, setErr] = useState('');
  const save = () => {
    const rec = {};
    for (const [k, label, , lo, hi] of FIELDS) {
      const v = vals[k];
      if (v == null || Number.isNaN(v)) continue;
      if (!Number.isFinite(v) || v < lo || v > hi) return setErr(`${label}: enter a number from ${lo} to ${hi}, or leave it empty.`);
      rec[k] = v;
    }
    if ((rec.sys == null) !== (rec.dia == null)) return setErr('Blood pressure needs both numbers.');
    if (mood != null) rec.mood = +mood;
    if (!Object.keys(rec).length) return setErr('Enter at least one reading.');
    addVitals(rec); go('today');
  };
  return (
    <VStack gap={5} maxWidth={820} width="100%">
      <PageIntro title="Readings">Typed in from your devices. Fill in what you have. Empty fields are skipped.</PageIntro>
      <Grid columns={{ minWidth: 220, repeat: 'fit' }} gap={4}>
        {FIELDS.map(([k, label, unit, lo, hi, step]) => <NumberInput key={k} label={label} units={unit} value={vals[k] ?? null} min={lo} max={hi} step={step} onChange={(v) => setVals((s) => ({ ...s, [k]: v }))} />)}
      </Grid>
      <VStack gap={2}>
        <Text type="label">Mood today, 1 low to 5 good</Text>
        <HStack>
          <ToggleButtonGroup label="Mood" type="single" value={mood} onChange={setMood}>
            {['1', '2', '3', '4', '5'].map((n) => <ToggleButton key={n} value={n} label={n} />)}
          </ToggleButtonGroup>
        </HStack>
      </VStack>
      {err && <Banner status="error" title={err} />}
      <HStack gap={3}>
        <Button label="Save readings" variant="primary" size="lg" onClick={save} />
        <Button label="Cancel" variant="ghost" size="lg" href="#/check" />
      </HStack>
    </VStack>
  );
}

export default function Check({ args }) {
  const { replay } = useApp();
  const type = args[0];
  if (replay) {
    return (
      <VStack gap={3} maxWidth={READ_WIDTH}>
        <Heading level={1}>Checks are paused in the replay</Heading>
        <Text as="p" color="secondary">The replay shows a simulated crew member. Exit the replay to test yourself.</Text>
        <HStack><Button label="Back to the replay" href="#/today" /></HStack>
      </VStack>
    );
  }
  if (type === 'vitals') return <Vitals />;
  if (TESTS[type]) return <Flow key={type} type={type} />;
  return <Hub />;
}
