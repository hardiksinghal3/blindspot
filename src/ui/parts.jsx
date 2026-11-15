// Pieces shared by several screens.
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Token } from '@astryxdesign/core/Token';
import { SOURCES } from '../lib/sources.js';
import { formatDelay } from '../lib/mission.js';
import { Status } from './Status.jsx';
import { LegendMark } from './graphics.jsx';

export const PAGE_WIDTH = 1120;
export const READ_WIDTH = 720;
export const BANNER_STATUS = { nogo: 'error', watch: 'warning', go: 'success', nodata: 'info' };
const ORIGIN = { nasa: ['NASA number', 'blue'], clinical: ['Clinical convention', 'gray'], prototype: ['Prototype setting', 'gray'] };

export function PageIntro({ title, children, action }) {
  return (
    <HStack hAlign="between" vAlign="end" gap={4} wrap="wrap">
      <VStack gap={2} maxWidth={READ_WIDTH}>
        <Heading level={1}>{title}</Heading>
        {children && <Text as="p" color="secondary">{children}</Text>}
      </VStack>
      {action}
    </HStack>
  );
}

export function SourceLinks({ ids }) {
  return (
    <VStack gap={2}>
      {ids.map((id) => {
        const s = SOURCES[id];
        return (
          <VStack key={id} gap={0}>
            {s.url ? <Link href={s.url} target="_blank" type="supporting" color="primary">{s.title}</Link> : <Text type="supporting">{s.title}</Text>}
            <Text type="supporting" color="secondary">{s.org}</Text>
          </VStack>
        );
      })}
    </VStack>
  );
}

// One flight rule: what it says, where its number comes from, and what it found today.
export function RuleItem({ rule, finding }) {
  const [label, color] = ORIGIN[rule.origin];
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
        <Heading level={4}>{rule.title}</Heading>
        <HStack gap={2} vAlign="center">
          <Token label={label} color={color} size="sm" />
          {finding && <Status status={finding.status} size="sm" />}
        </HStack>
      </HStack>
      {finding && <Text as="p">{finding.why}</Text>}
      {finding && finding.action && <Text as="p"><Text weight="semibold">Do now: </Text>{finding.action}</Text>}
      <Text as="p" color="secondary"><Text weight="semibold" color="inherit">Rule: </Text>{rule.trigger}</Text>
      <SourceLinks ids={rule.sources} />
    </VStack>
  );
}

export function Legend() {
  return (
    <HStack gap={4} vAlign="center">
      <HStack gap={1.5} vAlign="center"><LegendMark kind="felt" /><Text type="supporting">Felt (your call)</Text></HStack>
      <HStack gap={1.5} vAlign="center"><LegendMark kind="measured" /><Text type="supporting">Measured</Text></HStack>
    </HStack>
  );
}

export const replyText = (lt) => (!lt ? '' : lt.blackout ? 'Earth is out of contact until the Sun moves clear.' : `Earth's reply would take at least ${formatDelay(lt.seconds * 2)}.`);
