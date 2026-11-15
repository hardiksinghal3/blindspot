import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Link } from '@astryxdesign/core/Link';
import { Tag } from '../ui/Status.jsx';
import { Table } from '@astryxdesign/core/Table';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { ENVIRONMENTS, formatDelay, lightTime, isoDate, DAY_MS, BLACKOUT_DEG } from '../lib/mission.js';
import { HAZARDS } from '../lib/rules.js';
import { recentEvents } from '../lib/spaceweather.js';
import { useApp } from '../app/AppContext.jsx';
import { Status } from '../ui/Status.jsx';
import { fmtDate } from '../ui/graphics.jsx';
import { PageIntro } from '../ui/parts.jsx';

const FLUID = { display: 'block', width: '100%', height: 'auto' };
const LABEL = { fontFamily: 'var(--font-family-body)', fill: 'var(--color-text-secondary)' };

// Earth to Mars light-time over the next 26 months, from Horizons.
function LightTimeChart({ data, now }) {
  const pts = [];
  for (let i = 0; i <= 780; i += 6) { const v = lightTime(data, 'mars_surface', isoDate(Date.parse(now) + i * DAY_MS)); if (v) pts.push([i, v.seconds / 60, v.sunAngle < BLACKOUT_DEG]); }
  if (!pts.length) return null;
  const W = 560, H = 120, x = (i) => 30 + (i / 780) * (W - 40), y = (m) => H - 20 - (m / 23) * (H - 34);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={FLUID} role="img" aria-label="Earth to Mars light-time over the next 26 months">
      {pts.filter((p) => p[2]).map((p) => <rect key={p[0]} x={x(p[0]) - 2} y={8} width={5} height={H - 28} fill="var(--color-error)" opacity={0.25} />)}
      <polyline points={pts.map((p) => `${x(p[0])},${y(p[1])}`).join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
      {[5, 10, 15, 20].map((m) => <text key={m} x={24} y={y(m) + 3} textAnchor="end" fontSize={11} style={LABEL}>{m}</text>)}
      <text x={30} y={H - 5} fontSize={11} style={LABEL}>today</text>
      <text x={W - 10} y={H - 5} textAnchor="end" fontSize={11} style={LABEL}>+26 months</text>
      <circle cx={x(0)} cy={y(pts[0][1])} r={4} fill="var(--color-accent)" />
    </svg>
  );
}

const SEP_COLUMNS = [
  { key: 'when', header: 'Onset (UTC)' },
  { key: 'inst', header: 'Instrument and energy' },
  { key: 'link', header: 'Record', renderCell: (r) => (r.link ? <Link href={r.link} isExternalLink>DONKI</Link> : null) },
];
const PLAN_COLUMNS = [
  { key: 'name', header: 'Phase', renderCell: (r) => <HStack gap={2} vAlign="center"><Text>{r.name}</Text>{r.now && <Tag label="Now" />}</HStack> },
  { key: 'days', header: 'Days' }, { key: 'gravity', header: 'Gravity' }, { key: 'dose', header: 'Dose rate' }, { key: 'tests', header: 'Tests that apply' },
];

export default function Mission() {
  const { d, data, state, now, sep, replay } = useApp();
  const recent = recentEvents(sep, now, 30);
  const spe = d.ctx.spe, lt = d.lt, dose = d.dose;
  const plan = d.profile.phases.map((p, i) => {
    const e = ENVIRONMENTS[p.env];
    return { id: i, name: e.name, now: i === d.phase.index, days: p.days, gravity: e.gravity === 'micro' ? 'Weightless' : `${e.g} g`, dose: `${e.dose} mSv/day`, tests: e.gravity === 'micro' ? 'Reaction, vision, pointing, pulse' : 'Reaction, vision, pointing, pulse, sit-to-stand' };
  });
  return (
    <>
      <PageIntro title={d.profile.name} action={replay ? null : <Button label="Change mission" href="#/setup" />}>
        {d.env.name} · mission day {d.mday} of {dose.missionDays} · started {fmtDate(state.mission.start)}
      </PageIntro>

      <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4} align="start">
        <Card>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center"><Heading level={3}>Distance from Earth</Heading><Tag label="JPL Horizons" /></HStack>
            <Heading level={2} type="display-3" accessibilityLevel={4}>{lt ? (lt.blackout ? 'No contact' : formatDelay(lt.seconds)) : 'no data'}</Heading>
            <Text as="p" color="secondary">{lt ? (lt.blackout ? 'Mars is within 2 degrees of the Sun as seen from Earth. Radio contact is unreliable, so the crew decides alone.' : `One way. Ask a question now and the earliest answer arrives in ${formatDelay(lt.seconds * 2)}, plus the time the flight surgeon needs.`) : 'Ephemeris data did not load.'}</Text>
            {lt && lt.estimate && <Text as="p" type="supporting">Estimate. Horizons gives the Earth to Mars distance for today; the ship is assumed to cover it evenly during transit.</Text>}
            {data && d.env.body === 'mars' && (
              <>
                <LightTimeChart data={data} now={now} />
                <Text as="p" type="supporting">Earth to Mars one-way light-time in minutes. Red bands: solar conjunction, no reliable contact.</Text>
              </>
            )}
            {d.blackout && <Text as="p"><Text weight="semibold">Next blackout at Mars: </Text>{fmtDate(d.blackout.start)} to {fmtDate(d.blackout.end)} ({d.blackout.days} days).</Text>}
          </VStack>
        </Card>

        <Card>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center"><Heading level={3}>Radiation ledger</Heading><Tag label="NASA limit" /></HStack>
            <Heading level={2} type="display-3" accessibilityLevel={4}>{Math.round(dose.career)} mSv</Heading>
            <ProgressBar label={`Career dose so far, of ${dose.limit} mSv`} value={Math.min(dose.limit, dose.career)} max={dose.limit} variant={dose.shareNow >= 1 ? 'error' : 'accent'} />
            <MetadataList>
              <MetadataListItem label="Before this mission">{Math.round(state.mission.priorCareer || 0)} mSv</MetadataListItem>
              <MetadataListItem label={dose.estimated ? 'This mission so far (estimate)' : 'This mission (dosimeter)'}>{dose.mission.toFixed(1)} mSv</MetadataListItem>
              <MetadataListItem label="Rate here">{d.env.dose} mSv/day</MetadataListItem>
              <MetadataListItem label="Projected at mission end">{Math.round(dose.projected)} mSv</MetadataListItem>
            </MetadataList>
            <ProgressBar label={`Projected at mission end, of ${dose.limit} mSv`} value={Math.min(dose.limit, dose.projected)} max={dose.limit} variant={dose.shareProjected >= 1 ? 'warning' : 'accent'} />
            <Text as="p" type="supporting">Rough comparison. Rates are dose equivalent measured around the Solar System for December 2022 solar conditions; the 600 mSv limit is in effective dose. Solar storm dose depends on shielding, so enter the dosimeter reading instead of trusting the estimate.</Text>
          </VStack>
        </Card>
      </Grid>

      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
          <Heading level={2}>Solar particle events</Heading>
          <HStack gap={3} vAlign="center"><Tag label="NASA DONKI" /><Status status={spe ? spe.level : 'go'} size="sm" /></HStack>
        </HStack>
        {spe
          ? <Banner status={spe.level === 'nogo' ? 'error' : 'warning'} title="Event in the last 24 hours" description={`${spe.inst}, onset ${spe.t.replace('T', ' ').replace('Z', ' UTC')}.`} />
          : <Text as="p">No measured onset in the last 24 hours.</Text>}
        <Text as="p" color="secondary">{recent.length} onset record{recent.length === 1 ? '' : 's'} in the last 30 days.</Text>
        {recent.length > 0 && <Table idKey="id" columns={SEP_COLUMNS} density="compact" data={recent.slice(0, 8).map((e, i) => ({ id: i, when: e.t.replace('T', ' ').replace('Z', ''), inst: e.inst.join(', '), link: e.link }))} />}
        <Text as="p" type="supporting">{sep ? `${sep.events.length} records from ${sep.from} to ${sep.retrieved}, bundled in the app${replay ? '; the replay uses the real record for its dates' : ''}. They come from instruments near Earth and on STEREO A, so a ship in deep space would rely on its own detector. Model forecasts are left out.` : 'Solar event file not loaded.'}</Text>
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>Mission plan</Heading>
        <Table idKey="id" columns={PLAN_COLUMNS} data={plan} density="compact" />
        <Text as="p" type="supporting">Phase lengths are illustrative. Dose rates: Table 2 of the Artemis I radiation paper (Nature, 2024).</Text>
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>The five hazards NASA tracks</Heading>
        <Text>{Object.values(HAZARDS).join(' · ')}</Text>
        <Text as="p" color="secondary">Each body system in the <Link href="#/body">body poll</Link> shows which of these act on it.</Text>
      </VStack>
    </>
  );
}
