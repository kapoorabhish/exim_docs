import type { ThemeConfig } from 'antd';
import { colors } from './colors';
import { typography } from './typography';
import { borderRadius } from './spacing';

/**
 * Ant Design 5 theme configuration using EXIM design tokens
 */
export const antdTheme: ThemeConfig = {
  token: {
    // Primary
    colorPrimary: colors.primary[600],
    colorPrimaryBg: colors.primary[50],
    colorPrimaryBgHover: colors.primary[100],
    colorPrimaryBorder: colors.primary[200],
    colorPrimaryBorderHover: colors.primary[300],
    colorPrimaryHover: colors.primary[500],
    colorPrimaryActive: colors.primary[700],
    colorPrimaryTextHover: colors.primary[500],
    colorPrimaryText: colors.primary[600],
    colorPrimaryTextActive: colors.primary[700],

    // Success
    colorSuccess: colors.success[500],
    colorSuccessBg: colors.success[50],
    colorSuccessBorder: colors.success[200],

    // Warning
    colorWarning: colors.warning[500],
    colorWarningBg: colors.warning[50],
    colorWarningBorder: colors.warning[200],

    // Error
    colorError: colors.danger[500],
    colorErrorBg: colors.danger[50],
    colorErrorBorder: colors.danger[200],

    // Info
    colorInfo: colors.info[500],
    colorInfoBg: colors.info[50],
    colorInfoBorder: colors.info[200],

    // Neutrals
    colorBgContainer: colors.surface,
    colorBgLayout: colors.background,
    colorBgElevated: colors.white,
    colorBorder: colors.border,
    colorBorderSecondary: colors.neutral[200],
    colorText: colors.neutral[900],
    colorTextSecondary: colors.neutral[500],
    colorTextTertiary: colors.neutral[400],
    colorTextQuaternary: colors.neutral[300],

    // Typography
    fontFamily: typography.fontFamily.sans,
    fontSize: 14,
    fontSizeHeading1: 30,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,

    // Border radius
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,

    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,

    // Sizing
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,

    // Shadow
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  },

  components: {
    Button: {
      fontWeight: 500,
      primaryShadow: 'none',
    },
    Table: {
      headerBg: colors.neutral[50],
      headerColor: colors.neutral[700],
      headerSortActiveBg: colors.primary[50],
      rowHoverBg: colors.primary[50],
      borderColor: colors.neutral[200],
    },
    Card: {
      headerFontSize: 16,
    },
    Menu: {
      itemSelectedBg: colors.primary[50],
      itemSelectedColor: colors.primary[700],
    },
    Layout: {
      siderBg: colors.neutral[900],
      headerBg: colors.white,
    },
    Input: {
      activeShadow: `0 0 0 2px ${colors.primary[100]}`,
    },
  },
};
