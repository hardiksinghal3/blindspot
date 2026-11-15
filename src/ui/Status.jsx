import { HStack } from '@astryxdesign/core/Layout';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';

export const STATUS_WORD = { go: 'GO', watch: 'WATCH', nogo: 'NO-GO', nodata: 'NO DATA' };
const DOT = { go: 'success', watch: 'warning', nogo: 'error', nodata: 'neutral' };
const TYPE = { sm: 'supporting', md: 'body', lg: 'large' };

// Status is never colour alone: the word is always shown.
export function Status({ status, size = 'md' }) {
  return (
    <HStack gap={2} vAlign="center">
      <StatusDot variant={DOT[status]} label={STATUS_WORD[status]} />
      <Text type={TYPE[size]} color="primary" weight="semibold" textWrap="nowrap">{STATUS_WORD[status]}</Text>
    </HStack>
  );
}

// A short plain label, such as where a number comes from.
export function Tag({ label }) {
  return <Text type="supporting" color="secondary" weight="medium" textWrap="nowrap">{label}</Text>;
}
