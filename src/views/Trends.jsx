import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Link } from '@astryxdesign/core/Link';
import { missionDay } from '../lib/mission.js';
import { useApp } from '../app/AppContext.jsx';
import { Status } from '../ui/Status.jsx';
import { LineChart, GapChart } from '../ui/graphics.jsx';
import { PageIntro, Legend } from '../ui/parts.jsx';

const CARDS = [
  ['pvt', 'Mean response speed in the reaction test. Higher is better.'], ['lapses', 'Responses of 355 ms or slower.'],
  ['vision', 'Near acuity, worse eye. Each 0.1 is one line on the chart; lower is better.'], ['motor', 'Pointing throughput. Higher is better.'],
  ['temp', 'Dashed line: expected for this mission day. Core temperature rises about 1 °C over the first 2.5 months of flight, so the band rises with it.', true],
  ['sleep'], ['pulse'], ['mood'],
];

export default function Trends() {
  const { d, state } = useApp();
  const dayOf = (t) => missionDay(state.mission.start, t);
  const cards = CARDS.filter(([key]) => d.metrics[key]);
  return (
    <>
      <PageIntro title="Trends">Every reading is judged against your own normal, not an Earth average. The shaded band is your normal range: 1 and 2 spreads.</PageIntro>
      <Card>
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <Heading level={3}>Felt against measured</Heading>
            <Legend />
          </HStack>
          {d.gaps.length ? <GapChart gaps={d.gaps} dayOf={dayOf} /> : <Text as="p" color="secondary">Your predictions and results will be charted here.</Text>}
          <Text as="p" type="supporting">Each check is one vertical line from what you called to what you measured. Red lines are checks where you were below normal and rated yourself 20 or more points too high.</Text>
        </VStack>
      </Card>
      {cards.length ? (
        <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
          {cards.map(([key, note, showExpect]) => {
            const m = d.metrics[key];
            return (
              <Card key={key}>
                <VStack gap={2}>
                  <HStack hAlign="between" vAlign="center">
                    <Heading level={4}>{m.def.label}</Heading>
                    <Status status={m.last.status} size="sm" />
                  </HStack>
                  <HStack gap={3} vAlign="end" wrap="wrap">
                    <Heading level={2} accessibilityLevel={5}>{m.last.value.toFixed(m.def.digits)} {m.def.unit}</Heading>
                    <Text type="supporting">Your normal {m.base.center.toFixed(m.def.digits)} ± {m.base.spread.toFixed(2)}{m.base.provisional ? ' (provisional reference)' : ` (first ${m.base.n} sessions)`}</Text>
                  </HStack>
                  <LineChart points={m.points} base={m.base} digits={m.def.digits} dayOf={dayOf} showExpect={!!showExpect} label={`${m.def.label} over the mission`} />
                  {note && <Text as="p" type="supporting">{note}</Text>}
                </VStack>
              </Card>
            );
          })}
        </Grid>
      ) : <Text as="p" color="secondary">No readings yet. <Link href="#/check">Run a check</Link> or play the mission replay from the home page.</Text>}
    </>
  );
}
