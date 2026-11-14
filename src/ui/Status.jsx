import { Token } from '@astryxdesign/core/Token';

export const STATUS_WORD = { go: 'GO', watch: 'WATCH', nogo: 'NO-GO', nodata: 'NO DATA' };
const COLOR = { go: 'green', watch: 'yellow', nogo: 'red', nodata: 'gray' };

// Status is never colour alone: the word is always shown.
export function Status({ status, size = 'md' }) {
  return <Token label={STATUS_WORD[status]} color={COLOR[status]} size={size} />;
}
