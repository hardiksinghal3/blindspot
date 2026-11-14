import { AppShell } from '@astryxdesign/core/AppShell';
import { SideNav, SideNavHeading, SideNavSection, SideNavItem } from '@astryxdesign/core/SideNav';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { VStack, HStack, Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Slider } from '@astryxdesign/core/Slider';
import { Token } from '@astryxdesign/core/Token';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { CalendarDaysIcon, BeakerIcon, UserIcon, ChartBarIcon, GlobeAltIcon, ClipboardDocumentListIcon, PaperAirplaneIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { AppProvider, useApp } from './app/AppContext.jsx';
import { update, getState } from './lib/store.js';
import { formatDelay } from './lib/mission.js';
import { REPLAY_DAYS, REPLAY_EVENTS } from './lib/replay.js';
import { Status } from './ui/Status.jsx';
import { Logo } from './ui/graphics.jsx';
import { PAGE_WIDTH } from './ui/parts.jsx';
import { Reveal } from './ui/motion.jsx';
import { MediaTheme } from '@astryxdesign/core/theme';
import Landing from './views/Landing.jsx';
import Today from './views/Today.jsx';
import Body from './views/Body.jsx';
import Rules from './views/Rules.jsx';
import Trends from './views/Trends.jsx';
import Packet from './views/Packet.jsx';
import Check from './views/Check.jsx';
import Mission from './views/Mission.jsx';
import Sources from './views/Sources.jsx';
import Setup from './views/Setup.jsx';

const NAV = [
  ['today', 'Today', CalendarDaysIcon], ['check', 'Check', BeakerIcon], ['body', 'Body poll', UserIcon], ['trends', 'Trends', ChartBarIcon],
  ['mission', 'Mission', GlobeAltIcon], ['rules', 'Flight rules', ClipboardDocumentListIcon], ['packet', 'Surgeon packet', PaperAirplaneIcon], ['sources', 'Sources and limits', BookOpenIcon],
];
const VIEWS = { today: Today, check: Check, body: Body, rules: Rules, trends: Trends, packet: Packet, mission: Mission, sources: Sources, setup: Setup };

function ReplayBar() {
  const { replay, d, toggleReplay, setReplayDay, stopReplay } = useApp();
  const ev = [...REPLAY_EVENTS].reverse().find((e) => e.day <= replay.day);
  return (
    <Section padding={3} dividers={['bottom']} variant="muted">
      <VStack gap={2}>
        <HStack gap={4} vAlign="center" wrap="wrap">
          <Token label="SIMULATED" color="purple" />
          <Button label={replay.playing ? 'Pause' : 'Play'} size="sm" onClick={toggleReplay} />
          <VStack width={360} maxWidth="100%">
            <Slider label="Mission day" isLabelHidden value={replay.day} min={1} max={REPLAY_DAYS} onChange={setReplayDay} />
          </VStack>
          <Text hasTabularNumbers>Day {replay.day} of {REPLAY_DAYS}</Text>
          <Button label="Exit replay" size="sm" variant="ghost" onClick={stopReplay} />
        </HStack>
        <Text type="supporting">
          Simulated crew member and cabin, flown through NASA's real light-time and solar particle records.
          {ev ? ` Day ${ev.day}: ${ev.label}` : ''}{d.ctx.spe ? ' Solar particle event in NASA\'s record for this date (real data).' : ''}
        </Text>
      </VStack>
    </Section>
  );
}

function MissionStrip() {
  const { d } = useApp();
  const lt = d.lt;
  return (
    <Section padding={4} dividers={['bottom']}>
      <MetadataList orientation="horizontal">
        <MetadataListItem label="Environment">{d.env.name}</MetadataListItem>
        <MetadataListItem label="Mission day">{d.mday} of {d.dose.missionDays}</MetadataListItem>
        <MetadataListItem label={d.nextEvent.label}>{d.nextEvent.days} {d.nextEvent.days === 1 ? 'day' : 'days'}</MetadataListItem>
        <MetadataListItem label="Light-time to Earth">{lt ? (lt.blackout ? 'No contact' : formatDelay(lt.seconds) + (lt.estimate ? ' (est.)' : '')) : 'no data'}</MetadataListItem>
        <MetadataListItem label="Earliest reply">{lt ? (lt.blackout ? 'After conjunction' : formatDelay(lt.seconds * 2)) : 'no data'}</MetadataListItem>
        <MetadataListItem label="Career dose">{Math.round(d.dose.career)} of {d.dose.limit} mSv</MetadataListItem>
      </MetadataList>
    </Section>
  );
}

function FocusBar() {
  const forced = getState().settings.focus === 'on';
  return (
    <Banner
      status="info" container="section"
      title={forced ? 'Focus mode is on' : 'Focus mode turned itself on'}
      description={forced ? 'One instruction at a time.' : 'You measured below your normal, so the screen shows one instruction at a time.'}
      endContent={<Button label="Turn off" size="sm" onClick={() => update((s) => { s.settings.focus = 'off'; })} />}
    />
  );
}

function Missing({ name }) {
  return <Text as="p" color="secondary">The {name} screen is being rebuilt.</Text>;
}

function Shell() {
  const { route, replay, d } = useApp();
  const landing = route.name === '' || route.name === 'replay';
  const brand = <Logo />;

  if (landing) {
    return (
      <AppShell
        height="auto" variant="surface"
        topNav={<TopNav label="BlindSpot" heading={<TopNavHeading logo={brand} heading="BlindSpot" />} endContent={<Button label="Open the app" href="#/today" size="sm" />} />}>
        <Landing />
      </AppShell>
    );
  }

  const View = VIEWS[route.name];
  return (
    <AppShell
      height="fill"
      banner={replay ? <ReplayBar /> : undefined}
      sideNav={
        <MediaTheme mode="dark">
        <SideNav
          header={<SideNavHeading heading="BlindSpot" headingHref="#/" icon={brand} subheading="Research prototype" />}
          footer={d.result.overall !== 'nodata' ? <HStack gap={2} vAlign="center" padding={3}><Text type="supporting">Overall</Text><Status status={d.result.overall} size="sm" /></HStack> : undefined}>
          <SideNavSection title="Crew member" isHeaderHidden>
            {NAV.slice(0, 4).map(([p, label, icon]) => <SideNavItem key={p} label={label} href={`#/${p}`} icon={icon} isSelected={route.name === p} />)}
          </SideNavSection>
          <SideNavSection title="Mission">
            {NAV.slice(4).map(([p, label, icon]) => <SideNavItem key={p} label={label} href={`#/${p}`} icon={icon} isSelected={route.name === p} />)}
          </SideNavSection>
        </SideNav>
        </MediaTheme>
      }>
      <Layout
        height="fill" contentWidth={PAGE_WIDTH}
        header={<VStack gap={0}><MissionStrip />{d.focus && <FocusBar />}</VStack>}
        content={
          <LayoutContent padding={6}>
            <Reveal key={route.name} gap={6} rise={10}>{View ? <View args={route.args} /> : <Missing name={route.name} />}</Reveal>
          </LayoutContent>
        }
      />
    </AppShell>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
