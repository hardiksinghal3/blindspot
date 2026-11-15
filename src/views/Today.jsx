import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { Link } from '@astryxdesign/core/Link';
import { Tag } from '../ui/Status.jsx';
import { List, ListItem } from '@astryxdesign/core/List';
import { Center } from '@astryxdesign/core/Center';
import { SYSTEMS } from '../lib/rules.js';
import { TEST_NAME } from '../lib/model.js';
import { isoDate } from '../lib/mission.js';
import { gapLabel } from '../lib/scoring.js';
import { CountUp } from '../ui/motion.jsx';
import { useApp } from '../app/AppContext.jsx';
import { Status } from '../ui/Status.jsx';
import { GapBar, signed } from '../ui/graphics.jsx';
import { Legend, BANNER_STATUS, READ_WIDTH, replyText } from '../ui/parts.jsx';

const HEADLINE = { nodata: 'No checks yet today', go: 'Cleared for critical tasks', watch: 'Cleared with caution', nogo: 'Not cleared for critical tasks' };

export default function Today() {
  const { d, state, replay, now } = useApp();
  const top = d.result.top[0];
  // Show today's most over-confident call if there is one, otherwise the latest check.
  const todays = d.gaps.filter((g) => isoDate(g.t) === isoDate(now));
  const last = todays.length ? todays.reduce((a, b) => (b.gap > a.gap ? b : a)) : d.gaps[d.gaps.length - 1];
  const reply = replyText(d.lt);

  if (d.focus && top) {
    return (
      <Center>
        <Card padding={8} maxWidth={READ_WIDTH} width="100%">
          <VStack gap={5} hAlign="start">
            <Status status={top.status} size="lg" />
            <Heading level={1}>{top.why}</Heading>
            {top.action && <Text as="p" type="large">{top.action}</Text>}
            <Text as="p" color="secondary">{reply}</Text>
            <HStack gap={3} wrap="wrap">
              <Button label="Retest" variant="primary" size="lg" href="#/check" />
              <Button label="Tell the flight surgeon" size="lg" href="#/packet" />
            </HStack>
          </VStack>
        </Card>
      </Center>
    );
  }

  const doneToday = (type) => state.checks.some((c) => c.type === type && isoDate(c.t) === isoDate(now));
  const due = ['pvt', 'vision', 'motor', 'pulse'].filter((t) => !doneToday(t));

  return (
    <>
      <HStack hAlign="between" vAlign="end" gap={4} wrap="wrap">
        <VStack gap={1}>
          <Text type="supporting">{replay ? 'Simulated crew member' : state.profile.name || 'Crew member'}</Text>
          <Heading level={1}>{HEADLINE[d.result.overall]}</Heading>
        </VStack>
        {!replay && <Button label={due.length ? `Run check (${due.length} due)` : 'Run another check'} variant="primary" href="#/check" />}
      </HStack>

      {top ? (
        <Banner
          status={BANNER_STATUS[top.status]} title={top.why}
          description={top.action || undefined}
          endContent={<Button label="Why this rule fired" size="sm" href={`#/body/${top.rule.system}`} />}>
          <Text as="p" color="secondary">{top.advisory ? 'A long-term caution. It does not hold up today\'s tasks.' : reply}</Text>
        </Banner>
      ) : (
        <Banner
          status={d.result.overall === 'nodata' ? 'info' : 'success'}
          title={d.result.overall === 'nodata' ? 'Run a check to get your first reading' : 'Nothing needs action'}
          description={d.result.overall === 'nodata' ? 'Until you have 3 readings, results are judged against a provisional reference.' : 'Every system with data is inside your normal band.'}
        />
      )}

      <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
        <Card>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={3}>Insight Gap</Heading>
              {last && <Tag label={TEST_NAME[last.test]} />}
            </HStack>
            {last ? (
              <>
                <HStack gap={5} vAlign="end">
                  <Heading level={2} type="display-3" color={last.unaware ? 'accent' : 'primary'}><CountUp value={last.gap} format={(n) => signed(Math.round(n))} /></Heading>
                  <VStack gap={0}>
                    <Text type="supporting">Felt {last.felt} · measured {last.score}</Text>
                    <Text type="supporting">{gapLabel(last.gap)}</Text>
                  </VStack>
                </HStack>
                <GapBar felt={last.felt} measured={last.score} status={last.unaware ? 'nogo' : last.status} />
                <Legend />
              </>
            ) : <Text as="p" color="secondary">The gap between how you feel and how you measure appears here after your first check.</Text>}
            <Divider />
            <HStack hAlign="between" vAlign="center" gap={4}>
              <VStack gap={0}>
                <Text type="supporting">Calibration score</Text>
                <Text type="large" weight="semibold" hasTabularNumbers>{d.calibration == null ? 'n/a' : `${d.calibration} / 100`}</Text>
              </VStack>
              <Text type="supporting" justify="end">{d.bias == null ? 'How well you know yourself, over your last 7 checks.' : `You usually call it ${Math.abs(d.bias)} points ${d.bias >= 0 ? 'high' : 'low'}.`}</Text>
            </HStack>
          </VStack>
        </Card>

        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={3}>Body poll</Heading>
              <Link href="#/body">Open</Link>
            </HStack>
            <List hasDividers density="compact" edge="flush">
              {Object.entries(SYSTEMS).map(([id, s]) => <ListItem key={id} label={s.name} href={`#/body/${id}`} endContent={<Status status={d.result.systems[id].status} size="sm" />} />)}
            </List>
          </VStack>
        </Card>
      </Grid>
    </>
  );
}
