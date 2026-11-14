import { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { List, ListItem } from '@astryxdesign/core/List';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { SYSTEMS } from '../lib/rules.js';
import { formatDelay } from '../lib/mission.js';
import { exportJson } from '../lib/store.js';
import { useApp } from '../app/AppContext.jsx';
import { Status, STATUS_WORD } from '../ui/Status.jsx';
import { signed } from '../ui/graphics.jsx';
import { PageIntro } from '../ui/parts.jsx';

const MESSAGE = { margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-family-code)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' };

function download(name, body, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name;
  document.body.append(a); a.click(); a.remove();
}

export default function Packet() {
  const { d, state, now, replay } = useApp();
  const [copied, setCopied] = useState('');
  const lt = d.lt;
  const open = d.result.findings.filter((f) => f.status !== 'go');
  const todays = d.gaps.filter((g) => g.t.slice(0, 10) === now.slice(0, 10));
  const lastGap = todays.length ? todays.reduce((a, b) => (b.gap > a.gap ? b : a)) : d.gaps[d.gaps.length - 1];
  const text = [
    `BLINDSPOT PACKET${replay ? ' (SIMULATED DATA)' : ''}`,
    `Crew: ${state.profile.name || 'not named'} | ${d.env.name}, mission day ${d.mday} | sent ${new Date(now).toISOString().slice(0, 16)}Z`,
    `Overall: ${STATUS_WORD[d.result.overall]}`,
    lastGap ? `Self-assessment: felt ${lastGap.felt}, measured ${lastGap.score}, gap ${signed(lastGap.gap)}${lastGap.unaware ? ' (IMPAIRED AND UNAWARE)' : ''}. Calibration ${d.calibration ?? 'n/a'}/100.` : 'Self-assessment: no checks yet.',
    ...Object.entries(SYSTEMS).map(([id, s]) => `${s.name}: ${STATUS_WORD[d.result.systems[id].status]}`),
    ...open.map((f) => `FINDING [${STATUS_WORD[f.status]}] ${f.why}${f.action ? ' ON-BOARD ACTION ADVISED: ' + f.action : ''}`),
    `Career dose ${Math.round(d.dose.career)} of ${d.dose.limit} mSv (${d.dose.estimated ? 'estimated' : 'dosimeter'}).`,
    'Prototype output. Not a medical device.',
  ].join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied('Copied.'); } catch { setCopied('Copy failed. Select the text instead.'); } };

  return (
    <>
      <PageIntro title="Flight surgeon packet">A short message built for a slow link: what was measured, what the on-board rules advise, and what needs an answer.</PageIntro>
      <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4} align="start">
        <Card>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={3}>Message</Heading>
              <Status status={d.result.overall} />
            </HStack>
            <pre style={MESSAGE}>{text}</pre>
            <HStack gap={2} wrap="wrap" vAlign="center">
              <Button label="Copy message" variant="primary" onClick={copy} />
              <Button label="Download text" onClick={() => download(`blindspot-packet-day-${d.mday}.txt`, text, 'text/plain')} />
              <Button label="Print" onClick={() => window.print()} />
              {!replay && <Button label="Export all data" onClick={() => download('blindspot-data.json', exportJson(), 'application/json')} />}
              <Text type="supporting" role="status">{copied}</Text>
            </HStack>
          </VStack>
        </Card>
        <VStack gap={4}>
          <Card>
            <VStack gap={3}>
              <Heading level={3}>If sent now</Heading>
              <MetadataList>
                <MetadataListItem label="Reaches Earth in">{lt ? (lt.blackout ? 'no contact' : formatDelay(lt.seconds)) : 'no data'}</MetadataListItem>
                <MetadataListItem label="Earliest reply in">{lt ? (lt.blackout ? 'after conjunction' : formatDelay(lt.seconds * 2)) : 'no data'}</MetadataListItem>
                <MetadataListItem label="Size">{new Blob([text]).size} bytes</MetadataListItem>
              </MetadataList>
              {lt && lt.blackout
                ? <Banner status="warning" title="Earth is out of contact" description="Follow the on-board action for each finding." />
                : <Text as="p" type="supporting">The reply time is physics only. Until it arrives, the on-board action for each finding stands.</Text>}
            </VStack>
          </Card>
          <Card>
            <VStack gap={2}>
              <Heading level={3}>Open findings</Heading>
              {open.length
                ? <List hasDividers edge="flush">{open.map((f) => <ListItem key={f.rule.id} label={<Text>{f.why}</Text>} endContent={<Status status={f.status} size="sm" />} />)}</List>
                : <Text as="p" color="secondary">None.</Text>}
            </VStack>
          </Card>
        </VStack>
      </Grid>
    </>
  );
}
