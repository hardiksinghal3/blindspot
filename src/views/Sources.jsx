import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import { Link } from '@astryxdesign/core/Link';
import { Tag } from '../ui/Status.jsx';
import { Table } from '@astryxdesign/core/Table';
import { SOURCES } from '../lib/sources.js';
import { useApp } from '../app/AppContext.jsx';
import { PageIntro } from '../ui/parts.jsx';

const COLUMNS = [
  { key: 'title', header: 'Source', renderCell: (s) => <Link href={s.url} isExternalLink>{s.title}</Link> },
  { key: 'org', header: 'From' },
];
const LIMITS = [
  ['Not a medical device', 'BlindSpot does not diagnose or treat. It has not been tested in flight or in a clinical study.'],
  ['The Insight Gap is a hypothesis', 'It is built on sleep-restriction research showing people are largely unaware of their own deficits. It has not been validated as a spaceflight measure.'],
  ['Thresholds', 'Only the 600 mSv dose limit and the 3 and 2.5 mmHg carbon dioxide levels are NASA\'s. Blood pressure, blood sugar and oxygen thresholds are common clinical conventions and were not checked against a cited source. Everything else is a prototype setting.'],
  ['Browser tests are screening grade', 'Browsers add timing delay to reaction tests, so results are compared with your own baseline on the same device. Screen vision tests cannot draw letters smaller than the pixels allow. The camera pulse reading has not been checked against a reference device.'],
  ['Simulated data', 'In the 180-day mission replay the crew member and the cabin readings are simulated, and every screen is stamped. Light-time and solar events in the replay are real NASA data. Live mode uses only what you measure or type in.'],
  ['Solar events', 'DONKI records come from instruments near Earth and on STEREO A, not from the ship\'s position. The 24-hour window and the split at 100 MeV are prototype settings.'],
  ['Radiation ledger', 'A rough comparison: it sets dose-equivalent rates measured in one period of the solar cycle against a limit expressed in effective dose.'],
];

export default function Sources() {
  const { data, sep } = useApp();
  const all = Object.entries(SOURCES).filter(([, s]) => s.url).map(([id, s]) => ({ id, ...s }));
  return (
    <>
      <PageIntro title="Sources and limits">Where every number comes from, and what this prototype cannot claim.</PageIntro>

      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
          <Heading level={2}>Data used inside the app</Heading>
          <Tag label="NASA and partner data" />
        </HStack>
        <Table idKey="id" columns={COLUMNS} data={all.filter((s) => s.data)} density="compact" />
        <Text as="p" type="supporting">{data ? `Horizons data retrieved ${data.retrieved}: daily Earth to Mars and Earth to Moon range and Sun angle, 2023 to 2040, bundled so the app works with no link to Earth.` : 'Ephemeris file not loaded.'}</Text>
        <Text as="p" type="supporting">{sep ? `DONKI data retrieved ${sep.retrieved}: ${sep.events.length} solar energetic particle records since ${sep.from}. The mission replay flies real calendar dates (departure 20 November 2023), so its light-time and solar events are the real record for those dates.` : 'Solar event file not loaded.'}</Text>
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>References</Heading>
        <Table idKey="id" columns={COLUMNS} data={all.filter((s) => !s.data)} density="compact" />
      </VStack>

      <VStack gap={4}>
        <Heading level={2}>Limits</Heading>
        <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={6}>
          {LIMITS.map(([t, p]) => <VStack gap={1} key={t}><Heading level={4}>{t}</Heading><Text as="p" color="secondary">{p}</Text></VStack>)}
        </Grid>
      </VStack>

      <Divider />
      <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={6}>
        <VStack gap={1}>
          <Heading level={4}>Use of SI (AI) tools</Heading>
          <Text as="p" color="secondary">The code, text and graphics of this prototype were produced with SI coding tools. No SI-generated images, video or audio are used, and no NASA logos or insignia appear. BlindSpot is not endorsed by NASA.</Text>
        </VStack>
        <VStack gap={1}>
          <Heading level={4}>Privacy</Heading>
          <Text as="p" color="secondary">Readings are stored only in this browser. Camera frames are processed on the device and never saved or sent.</Text>
        </VStack>
        <VStack gap={1}>
          <Heading level={4}>Interface</Heading>
          <Text as="p" color="secondary">Built with Astryx, Meta's open-source design system (MIT licence). Its use here does not imply endorsement by Meta.</Text>
        </VStack>
      </Grid>
    </>
  );
}
