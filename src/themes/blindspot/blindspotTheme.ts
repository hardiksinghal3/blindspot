// BlindSpot's theme: Astryx Neutral with a signal-blue accent, cool-tinted greys and a little movement.
import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

// The night side: the navigation rail and the landing page's opening panel.
const night = '#0B1733';

const lift = 'transform var(--duration-fast) var(--ease-move), box-shadow var(--duration-fast) var(--ease-standard)';

export const blindspotTheme = defineTheme({
  name: 'blindspot',
  extends: neutralTheme,
  color: {accent: ['#1B5FD9', '#7FB0FF'], neutralStyle: 'cool', contrast: 'standard'},
  motion: {tempo: 1, character: 'expressive'},
  components: {
    'clickable-card': {
      base: {
        transition: lift,
        ':hover': {transform: 'translateY(-3px) scale(1.012)', boxShadow: 'var(--shadow-med)'},
        ':active': {transform: 'translateY(0) scale(0.995)'},
      },
    },
    'side-nav': {base: {backgroundColor: night}},
    card: {'variant:night': {backgroundColor: night, borderColor: night}},
    button: {
      base: {
        transition: lift,
        ':hover': {transform: 'translateY(-1px)'},
        ':active': {transform: 'translateY(0) scale(0.98)'},
      },
    },
  },
  adaptations: {
    rules: [
      {
        when: {motion: 'reduce'},
        value: {
          components: {
            'clickable-card': {base: {':hover': {transform: 'none'}, ':active': {transform: 'none'}}},
            button: {base: {':hover': {transform: 'none'}, ':active': {transform: 'none'}}},
          },
        },
      },
    ],
  },
});
