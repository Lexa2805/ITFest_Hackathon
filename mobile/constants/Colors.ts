import { theme } from './theme';

const tintColor = theme.colors.green.primary;

export default {
  light: {
    text: theme.colors.text.primary,
    background: theme.colors.background.main,
    tint: tintColor,
    tabIconDefault: theme.colors.ui.inactiveIcon,
    tabIconSelected: tintColor,
  },
  dark: {
    text: theme.colors.text.primary,
    background: theme.colors.background.main,
    tint: tintColor,
    tabIconDefault: theme.colors.ui.inactiveIcon,
    tabIconSelected: tintColor,
  },
};
