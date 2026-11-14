import { VStack } from '@astryxdesign/core/Layout';
import { Heading } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { RULES, SYSTEMS } from '../lib/rules.js';
import { useApp } from '../app/AppContext.jsx';
import { PageIntro, RuleItem } from '../ui/parts.jsx';

export default function Rules() {
  const { d } = useApp();
  return (
    <>
      <PageIntro title="Flight rules">Decisions come from these written rules, agreed before the mission, not from a model you cannot inspect. Each rule shows where its number comes from.</PageIntro>
      <Banner
        status="info" title="Which numbers are NASA's"
        description={'Only the 600 mSv dose limit and the 3 and 2.5 mmHg carbon dioxide levels are NASA\'s numbers. Rules marked "Prototype setting" use thresholds chosen for this prototype; their sources are the evidence behind the idea, not approval of the threshold.'}
      />
      {Object.entries(SYSTEMS).map(([id, s]) => (
        <VStack gap={4} key={id}>
          <Divider />
          <Heading level={2}>{s.name}</Heading>
          <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={6} align="start">
            {RULES.filter((r) => r.system === id).map((r) => <RuleItem key={r.id} rule={r} finding={d.result.findings.find((f) => f.rule.id === r.id)} />)}
          </Grid>
        </VStack>
      ))}
    </>
  );
}
