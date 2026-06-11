/**
 * ProtectedPay — Single source of truth for all design tokens.
 *
 * Color scheme:
 *   Background  → charcoal/slate (not pure black)
 *   Primary     → teal/cyan-leaning green
 *   Success     → muted green
 *   Warning     → amber
 *   Danger      → rose/red
 *   Text        → soft off-white + 2 muted levels
 *
 * Change values here → CSS variables in globals.css update → entire UI updates.
 */

export const theme = {
  dark: {
    // ── Primary — teal/cyan-leaning green ─────────────────────────────────
    primary:              '#2DD4BF', // teal-400
    primaryHover:         '#14B8A6', // teal-500
    primaryFg:            '#042F2E', // near-black teal
    primaryContainer:     '#0D3330', // deep teal surface
    onPrimaryContainer:   '#99F6E4', // teal-200

    // ── Secondary — softer cyan ────────────────────────────────────────────
    secondary:            '#67E8F9', // cyan-300
    secondaryHover:       '#22D3EE', // cyan-400
    secondaryFg:          '#083344',
    secondaryContainer:   '#0C3040',
    onSecondaryContainer: '#A5F3FC', // cyan-200

    // ── Accent — warm teal highlight ───────────────────────────────────────
    accent:               '#5EEAD4', // teal-300
    accentHover:          '#2DD4BF',
    accentFg:             '#042F2E',
    accentContainer:      '#0D3330',
    onAccentContainer:    '#CCFBF1', // teal-100

    // ── Semantic ───────────────────────────────────────────────────────────
    success:              '#4ADE80', // muted green — green-400
    successHover:         '#22C55E',
    successContainer:     '#052E16', // green-950
    onSuccessContainer:   '#86EFAC', // green-300

    warning:              '#FBBF24', // amber-400
    warningHover:         '#F59E0B',
    warningContainer:     '#2D1A00',
    onWarningContainer:   '#FDE68A', // amber-200

    error:                '#FB7185', // rose-400
    errorHover:           '#F43F5E',
    errorContainer:       '#2D0A12',
    onErrorContainer:     '#FECDD3', // rose-200

    // ── Surfaces — charcoal/slate, NOT pure black ──────────────────────────
    background:           '#0F1117', // slate-950 with slight warmth
    surface:              '#0F1117',
    surfaceElevated:      '#161B22', // slate-900 — GitHub dark style
    surfaceCard:          '#1C2128', // slate-800 tinted
    surfaceBorder:        '#2D333B', // slate-700
    surfaceHover:         '#22272E',
    surfaceActive:        '#373E47',

    // ── Text — soft off-white + 2 muted levels ─────────────────────────────
    foreground:           '#E6EDF3', // soft off-white (not #FFF)
    foregroundMuted:      '#8B949E', // muted level 1 — slate-400
    foregroundSubtle:     '#484F58', // muted level 2 — slate-600

    // ── Misc ───────────────────────────────────────────────────────────────
    border:               '#2D333B',
    ring:                 '#2DD4BF',
    overlay:              'rgba(1,4,9,0.75)',

    // ── Gradients ──────────────────────────────────────────────────────────
    gradientHero:         'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(45,212,191,0.18) 0%, transparent 60%)',
    gradientCard:         'linear-gradient(135deg, rgba(45,212,191,0.06) 0%, rgba(103,232,249,0.03) 100%)',
    gradientPrimary:      'linear-gradient(135deg, #2DD4BF 0%, #67E8F9 100%)',
    gradientText:         'linear-gradient(135deg, #2DD4BF 0%, #5EEAD4 50%, #67E8F9 100%)',
  },

  light: {
    // ── Primary — teal/cyan-leaning green ─────────────────────────────────
    primary:              '#0D9488', // teal-600
    primaryHover:         '#0F766E', // teal-700
    primaryFg:            '#FFFFFF',
    primaryContainer:     '#CCFBF1', // teal-100
    onPrimaryContainer:   '#042F2E',

    // ── Secondary ─────────────────────────────────────────────────────────
    secondary:            '#0891B2', // cyan-600
    secondaryHover:       '#0E7490',
    secondaryFg:          '#FFFFFF',
    secondaryContainer:   '#CFFAFE', // cyan-100
    onSecondaryContainer: '#164E63',

    // ── Accent ────────────────────────────────────────────────────────────
    accent:               '#0D9488',
    accentHover:          '#0F766E',
    accentFg:             '#FFFFFF',
    accentContainer:      '#F0FDFA', // teal-50
    onAccentContainer:    '#042F2E',

    // ── Semantic ───────────────────────────────────────────────────────────
    success:              '#16A34A', // green-600
    successHover:         '#15803D',
    successContainer:     '#DCFCE7', // green-100
    onSuccessContainer:   '#14532D',

    warning:              '#D97706', // amber-600
    warningHover:         '#B45309',
    warningContainer:     '#FEF3C7', // amber-100
    onWarningContainer:   '#78350F',

    error:                '#E11D48', // rose-600
    errorHover:           '#BE123C',
    errorContainer:       '#FFE4E6', // rose-100
    onErrorContainer:     '#881337',

    // ── Surfaces — light slate/warm white ─────────────────────────────────
    background:           '#F8FAFC', // slate-50
    surface:              '#F8FAFC',
    surfaceElevated:      '#FFFFFF',
    surfaceCard:          '#FFFFFF',
    surfaceBorder:        '#E2E8F0', // slate-200
    surfaceHover:         '#F1F5F9', // slate-100
    surfaceActive:        '#E2E8F0',

    // ── Text ───────────────────────────────────────────────────────────────
    foreground:           '#0F172A', // slate-900
    foregroundMuted:      '#475569', // slate-600
    foregroundSubtle:     '#94A3B8', // slate-400

    // ── Misc ───────────────────────────────────────────────────────────────
    border:               '#E2E8F0',
    ring:                 '#0D9488',
    overlay:              'rgba(15,23,42,0.4)',

    // ── Gradients ──────────────────────────────────────────────────────────
    gradientHero:         'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13,148,136,0.1) 0%, transparent 60%)',
    gradientCard:         'linear-gradient(135deg, rgba(13,148,136,0.05) 0%, rgba(8,145,178,0.03) 100%)',
    gradientPrimary:      'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
    gradientText:         'linear-gradient(135deg, #0D9488 0%, #0891B2 50%, #06B6D4 100%)',
  },
} as const;

export type ThemeMode = 'dark' | 'light';
export type ThemeTokens = typeof theme.dark;

/** Per-feature accent colors — each page has its own identity */
export const featureColors = {
  escrow: {
    dark:  { accent: '#2DD4BF', bg: 'rgba(45,212,191,0.1)',  border: 'rgba(45,212,191,0.25)' },
    light: { accent: '#0D9488', bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.2)'  },
  },
  group: {
    dark:  { accent: '#67E8F9', bg: 'rgba(103,232,249,0.1)', border: 'rgba(103,232,249,0.25)' },
    light: { accent: '#0891B2', bg: 'rgba(8,145,178,0.08)',  border: 'rgba(8,145,178,0.2)'   },
  },
  batch: {
    dark:  { accent: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)' },
    light: { accent: '#16A34A', bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.2)'   },
  },
  profile: {
    dark:  { accent: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
    light: { accent: '#D97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.2)'   },
  },
} as const;
