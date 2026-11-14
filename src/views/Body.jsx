import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import { Token } from '@astryxdesign/core/Token';
import { Link } from '@astryxdesign/core/Link';
import { SYSTEMS, HAZARDS, RULES } from '../lib/rules.js';
import { useApp, go } from '../app/AppContext.jsx';
import { Status } from '../ui/Status.jsx';
import { BodyFigure } from '../ui/graphics.jsx';
import { PageIntro, RuleItem } from '../ui/parts.jsx';

const ORDER = { nogo: 0, watch: 1, go: 2, nodata: 3 };

export default function Body({ args }) {
  const { d } = useApp();
  const sel = SYSTEMS[args[0]] ? args[0] : Object.keys(SYSTEMS).sort((a, b) => ORDER[d.result.systems[a].status] - ORDER[d.result.systems[b].status])[0];
  const sys = SYSTEMS[sel], res = d.result.systems[sel];
  const rules = RULES.filter((r) => r.system === sel);
  return (
    <>
      <PageIntro title="Body poll">Like a launch poll, each system answers GO, WATCH or NO-GO. Select a system to see the rule behind its answer.</PageIntro>
      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={6} align="start">
        <Card maxWidth={380}>
          <BodyFigure systems={d.result.systems} selected={sel} onSelect={(id) => go(`body/${id}`)} />
        </Card>
        <VStack gap={5}>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center" gap={3}>
              <VStack gap={0}>
                <Text type="supporting">{sys.part}</Text>
                <Heading level={2}>{sys.name}</Heading>
              </VStack>
              <Status status={res.status} size="lg" />
            </HStack>
            <Text as="p">{sys.does}</Text>
            <Text as="p" color="secondary"><Text weight="semibold" color="inherit">In space: </Text>{sys.affects}</Text>
            <HStack gap={2} wrap="wrap">{sys.hazards.map((x) => <Token key={x} label={HAZARDS[x]} size="sm" />)}</HStack>
          </VStack>
          {rules.map((r) => (
            <VStack gap={5} key={r.id}>
              <Divider />
              <RuleItem rule={r} finding={res.findings.find((f) => f.rule.id === r.id)} />
            </VStack>
          ))}
          {res.status === 'nodata' && <Text as="p" color="secondary">No data yet for this system. <Link href="#/check">Run a check or enter readings.</Link></Text>}
        </VStack>
      </Grid>
    </>
  );
}
