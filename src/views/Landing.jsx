import { VStack, HStack, Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Table } from '@astryxdesign/core/Table';
import { MediaTheme } from '@astryxdesign/core/theme';
import { getState } from '../lib/store.js';
import { lightTime, formatDelay, isoDate } from '../lib/mission.js';
import { useApp } from '../app/AppContext.jsx';
import { Status } from '../ui/Status.jsx';
import { GapBar, SignalPath } from '../ui/graphics.jsx';
import { Reveal, CountUp } from '../ui/motion.jsx';
import { Legend, PAGE_WIDTH, READ_WIDTH } from '../ui/parts.jsx';

const EVIDENCE = [
  { id: 'sleep', finding: 'Fourteen days of sleep limited to 6 hours or less cut performance as much as up to two nights with no sleep. The subjects were largely unaware of it.', source: 'Van Dongen and others, Sleep, 2003', href: 'https://pubmed.ncbi.nlm.nih.gov/12683469/' },
  { id: 'delay', finding: 'The longest one-way signal time between Earth and Mars is about 22 minutes. A question and its answer take up to 44.', source: 'NASA / JPL Horizons, bundled in this app', href: '#/mission' },
  { id: 'sans', finding: 'About 70 % of space station astronauts get some swelling at the back of the eye. Near vision is one thing BlindSpot tests.', source: 'NASA Human Research Program', href: 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/' },
];
const COLUMNS = [
  { key: 'finding', header: 'What the research found' },
  { key: 'source', header: 'Source', renderCell: (row) => <Link href={row.href} isExternalLink={!row.href.startsWith('#')}>{row.source}</Link> },
];

function Example() {
  return (
    <Card padding={5} maxWidth={READ_WIDTH} width="100%">
      <VStack gap={4}>
        <HStack hAlign="between" vAlign="center">
          <Text type="label">Alertness check</Text>
          <Status status="nogo" />
        </HStack>
        <HStack gap={8} wrap="wrap">
          <VStack gap={0}><Text type="supporting">You called</Text><Heading level={2} accessibilityLevel={3}><CountUp value={82} /></Heading></VStack>
          <VStack gap={0}><Text type="supporting">You measured</Text><Heading level={2} accessibilityLevel={3}><CountUp value={9} from={82} /></Heading></VStack>
          <VStack gap={0}><Text type="supporting">Insight Gap</Text><Heading level={2} accessibilityLevel={3}>+<CountUp value={73} /></Heading></VStack>
        </HStack>
        <GapBar felt={82} measured={9} status="nogo" />
        <Legend />
        <Divider />
        <Text as="p"><Text weight="semibold">Impaired and unaware. </Text>Do not self-certify. Hand over critical tasks and ask a crewmate to cross-check. Earth cannot answer for 38 min 12 s.</Text>
        <Text type="supporting">Example screen with illustrative numbers.</Text>
      </VStack>
    </Card>
  );
}

// Today's real one-way signal time between Earth and Mars, from the bundled JPL Horizons table.
function Signal() {
  const { data, now } = useApp();
  const lt = data && lightTime(data, 'mars_surface', isoDate(now));
  const text = !lt ? 'One-way signal time between Earth and Mars: 3 to 22 minutes.'
    : lt.blackout ? 'Today Mars is behind the Sun. No signal gets through.'
      : `A signal sent now reaches Mars in ${formatDelay(lt.seconds)}. The answer takes as long again.`;
  return (
    <VStack gap={1} width="100%" maxWidth={READ_WIDTH}>
      <SignalPath label={text} />
      <Text as="p" type="supporting" justify="center">{text} {lt ? 'Source: JPL Horizons.' : ''}</Text>
    </VStack>
  );
}

export default function Landing() {
  const { startReplay } = useApp();
  return (
    <Layout
      height="auto" contentWidth={PAGE_WIDTH}
      content={
        <LayoutContent padding={6}>
          <VStack gap={10}>
            <VStack gap={6} hAlign="center">
              <MediaTheme mode="dark">
                <Card variant="night" padding={8} width="100%">
                  <Reveal gap={6} hAlign="center" rise={12}>
                    <VStack gap={3} hAlign="center" maxWidth={READ_WIDTH}>
                      <Heading level={1} type="display-2" justify="center" textWrap="balance">The health monitor that does not trust how you feel</Heading>
                      <Text as="p" type="large" color="secondary" justify="center" textWrap="balance">
                        On the way to Mars, astronauts have to spot changes in themselves. But a tired brain rates itself as fine. BlindSpot asks how you feel, measures how you are, and acts on the gap.
                      </Text>
                    </VStack>
                    <HStack gap={3} wrap="wrap" hAlign="center">
                      <Button label="Run today's check" variant="primary" size="lg" href={getState().settings.onboarded ? '#/check' : '#/setup'} />
                      <Button label="Play a 180-day mission" size="lg" onClick={() => startReplay(1, true)} />
                    </HStack>
                    <Signal />
                  </Reveal>
                </Card>
              </MediaTheme>
              <Text as="p" type="supporting" justify="center">The check takes about a minute and uses only this device. The replay flies a simulated crew member through real NASA light-time and solar storm data.</Text>
              <Reveal hAlign="center" width="100%" delay={150}><Example /></Reveal>
            </VStack>

            <Reveal gap={4}>
              <Heading level={2}>Why self-report is not enough</Heading>
              <Table data={EVIDENCE} columns={COLUMNS} idKey="id" verticalAlign="top" />
            </Reveal>

            <Reveal gap={4}>
              <Heading level={2}>How it works</Heading>
              <List listStyle="decimal" hasDividers edge="flush">
                <ListItem label="Call it" description="Before each test you predict your result on a slider." />
                <ListItem label="Test it" description="Reaction time, near vision, pointing and pulse, measured on this device against your own baseline." />
                <ListItem label="See the gap" description="Felt minus measured. A large gap while impaired is the most dangerous state, and it gets its own alarm." />
                <ListItem label="Act without Earth" description="Each body system reports GO, WATCH or NO-GO from written rules, with the source of every number." />
              </List>
            </Reveal>

            <Reveal>
            <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={6}>
              <VStack gap={2}>
                <Heading level={3}>NASA data inside</Heading>
                <Text as="p" color="secondary">Light-time and communication blackouts come from the JPL Horizons system. Solar particle alerts come from NASA's DONKI record. Radiation dose uses rates measured around the Solar System and NASA's 600 mSv career limit. Cabin air uses NASA's 3 mmHg carbon dioxide limit.</Text>
                <Link href="#/sources">Sources and limits</Link>
              </VStack>
              <VStack gap={2}>
                <Heading level={3}>What this is not</Heading>
                <Text as="p" color="secondary">Not a medical device and not validated in flight. The Insight Gap is a hypothesis built on sleep research. Thresholds that are not NASA's are marked as this prototype's own on every rule.</Text>
                <Link href="#/rules">Read the flight rules</Link>
              </VStack>
            </Grid>
            </Reveal>

            <Divider />
            <Text as="p" type="supporting">Research prototype for the 2026 NASA Space Apps Challenge. Not a medical device. Not endorsed by NASA. The code and text were produced with SI (AI) coding tools; no SI-generated images, video or audio are used.</Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
