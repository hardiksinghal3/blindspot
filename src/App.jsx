import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';

export default function App() {
  return (
    <VStack gap={4}>
      <Heading level={1}>BlindSpot</Heading>
      <Text>Astryx toolchain check.</Text>
      <Button label="Run today's check" />
    </VStack>
  );
}
