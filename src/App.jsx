import { AppShell } from '@astryxdesign/core/AppShell';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { AppProvider, useApp } from './app/AppContext.jsx';
import { Status } from './ui/Status.jsx';

function Placeholder() {
  const { d, route } = useApp();
  return (
    <VStack gap={4} padding={6}>
      <Heading level={1}>BlindSpot</Heading>
      <Text>Route: {route.name || 'home'} · mission day {d.mday} · {d.env.name}</Text>
      <Status status={d.result.overall} />
    </VStack>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell height="auto" contentPadding={0}>
        <Placeholder />
      </AppShell>
    </AppProvider>
  );
}
