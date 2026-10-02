/** @type {import('tailwindcss').Config} */
// The standalone package rather than @gluestack-ui/utils/nativewind-utils,
// which exports the same plugin but ships ESM only — Node can't require() it
// from a config file. This is the sole remaining reason that package is a
// dependency; every other call site uses the utils build.
const { designTokens } = require('./src/constants/design-tokens');
const radius = designTokens.radius.control;
const gluestackPlugin = require('@gluestack-ui/nativewind-utils/tailwind-plugin');

module.exports = {
  darkMode: 'class',
  content: ['src/app/**/*.{tsx,jsx,ts,js}', 'src/components/**/*.{tsx,jsx,ts,js}', 'src/features/**/*.{tsx,jsx,ts,js}'],
  presets: [require('nativewind/preset')],
  safelist: [
    {
      pattern:
        /(bg|border|text|stroke|fill)-(primary|secondary|tertiary|error|success|warning|info|typography|outline|background|indicator)-(0|50|100|200|300|400|500|600|700|800|900|950|white|gray|black|error|warning|muted|success|info|light|dark|primary)/,
    },
  ],
  theme: {
    // All corner utilities share the product radius; full is reserved for circular geometry.
    borderRadius: {
      none: '0px',
      ...Object.fromEntries(['DEFAULT', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].map((key) => [key, `${radius}px`])),
      full: '9999px',
    },
    extend: {
      spacing: Object.fromEntries(Object.entries(designTokens.icon).map(([role, size]) => [`icon-${role}`, `${size}px`])),
      colors: {
        // Scrims over photos and video, and the light content on them; the same in both themes.
        media: 'rgb(var(--surface-role-media)/<alpha-value>)',
        'on-media': 'rgb(var(--surface-role-onMedia)/<alpha-value>)',
        primary: {
          0: 'rgb(var(--color-primary-0)/<alpha-value>)',
          50: 'rgb(var(--color-primary-50)/<alpha-value>)',
          100: 'rgb(var(--color-primary-100)/<alpha-value>)',
          200: 'rgb(var(--color-primary-200)/<alpha-value>)',
          300: 'rgb(var(--color-primary-300)/<alpha-value>)',
          400: 'rgb(var(--color-primary-400)/<alpha-value>)',
          500: 'rgb(var(--color-primary-500)/<alpha-value>)',
          600: 'rgb(var(--color-primary-600)/<alpha-value>)',
          700: 'rgb(var(--color-primary-700)/<alpha-value>)',
          800: 'rgb(var(--color-primary-800)/<alpha-value>)',
          900: 'rgb(var(--color-primary-900)/<alpha-value>)',
          950: 'rgb(var(--color-primary-950)/<alpha-value>)',
        },
        secondary: {
          0: 'rgb(var(--color-secondary-0)/<alpha-value>)',
          50: 'rgb(var(--color-secondary-50)/<alpha-value>)',
          100: 'rgb(var(--color-secondary-100)/<alpha-value>)',
          200: 'rgb(var(--color-secondary-200)/<alpha-value>)',
          300: 'rgb(var(--color-secondary-300)/<alpha-value>)',
          400: 'rgb(var(--color-secondary-400)/<alpha-value>)',
          500: 'rgb(var(--color-secondary-500)/<alpha-value>)',
          600: 'rgb(var(--color-secondary-600)/<alpha-value>)',
          700: 'rgb(var(--color-secondary-700)/<alpha-value>)',
          800: 'rgb(var(--color-secondary-800)/<alpha-value>)',
          900: 'rgb(var(--color-secondary-900)/<alpha-value>)',
          950: 'rgb(var(--color-secondary-950)/<alpha-value>)',
        },
        tertiary: {
          50: 'rgb(var(--color-tertiary-50)/<alpha-value>)',
          100: 'rgb(var(--color-tertiary-100)/<alpha-value>)',
          200: 'rgb(var(--color-tertiary-200)/<alpha-value>)',
          300: 'rgb(var(--color-tertiary-300)/<alpha-value>)',
          400: 'rgb(var(--color-tertiary-400)/<alpha-value>)',
          500: 'rgb(var(--color-tertiary-500)/<alpha-value>)',
          600: 'rgb(var(--color-tertiary-600)/<alpha-value>)',
          700: 'rgb(var(--color-tertiary-700)/<alpha-value>)',
          800: 'rgb(var(--color-tertiary-800)/<alpha-value>)',
          900: 'rgb(var(--color-tertiary-900)/<alpha-value>)',
          950: 'rgb(var(--color-tertiary-950)/<alpha-value>)',
        },
        error: {
          0: 'rgb(var(--color-error-0)/<alpha-value>)',
          50: 'rgb(var(--color-error-50)/<alpha-value>)',
          100: 'rgb(var(--color-error-100)/<alpha-value>)',
          200: 'rgb(var(--color-error-200)/<alpha-value>)',
          300: 'rgb(var(--color-error-300)/<alpha-value>)',
          400: 'rgb(var(--color-error-400)/<alpha-value>)',
          500: 'rgb(var(--color-error-500)/<alpha-value>)',
          600: 'rgb(var(--color-error-600)/<alpha-value>)',
          700: 'rgb(var(--color-error-700)/<alpha-value>)',
          800: 'rgb(var(--color-error-800)/<alpha-value>)',
          900: 'rgb(var(--color-error-900)/<alpha-value>)',
          950: 'rgb(var(--color-error-950)/<alpha-value>)',
        },
        success: {
          0: 'rgb(var(--color-success-0)/<alpha-value>)',
          50: 'rgb(var(--color-success-50)/<alpha-value>)',
          100: 'rgb(var(--color-success-100)/<alpha-value>)',
          200: 'rgb(var(--color-success-200)/<alpha-value>)',
          300: 'rgb(var(--color-success-300)/<alpha-value>)',
          400: 'rgb(var(--color-success-400)/<alpha-value>)',
          500: 'rgb(var(--color-success-500)/<alpha-value>)',
          600: 'rgb(var(--color-success-600)/<alpha-value>)',
          700: 'rgb(var(--color-success-700)/<alpha-value>)',
          800: 'rgb(var(--color-success-800)/<alpha-value>)',
          900: 'rgb(var(--color-success-900)/<alpha-value>)',
          950: 'rgb(var(--color-success-950)/<alpha-value>)',
        },
        warning: {
          0: 'rgb(var(--color-warning-0)/<alpha-value>)',
          50: 'rgb(var(--color-warning-50)/<alpha-value>)',
          100: 'rgb(var(--color-warning-100)/<alpha-value>)',
          200: 'rgb(var(--color-warning-200)/<alpha-value>)',
          300: 'rgb(var(--color-warning-300)/<alpha-value>)',
          400: 'rgb(var(--color-warning-400)/<alpha-value>)',
          500: 'rgb(var(--color-warning-500)/<alpha-value>)',
          600: 'rgb(var(--color-warning-600)/<alpha-value>)',
          700: 'rgb(var(--color-warning-700)/<alpha-value>)',
          800: 'rgb(var(--color-warning-800)/<alpha-value>)',
          900: 'rgb(var(--color-warning-900)/<alpha-value>)',
          950: 'rgb(var(--color-warning-950)/<alpha-value>)',
        },
        info: {
          0: 'rgb(var(--color-info-0)/<alpha-value>)',
          50: 'rgb(var(--color-info-50)/<alpha-value>)',
          100: 'rgb(var(--color-info-100)/<alpha-value>)',
          200: 'rgb(var(--color-info-200)/<alpha-value>)',
          300: 'rgb(var(--color-info-300)/<alpha-value>)',
          400: 'rgb(var(--color-info-400)/<alpha-value>)',
          500: 'rgb(var(--color-info-500)/<alpha-value>)',
          600: 'rgb(var(--color-info-600)/<alpha-value>)',
          700: 'rgb(var(--color-info-700)/<alpha-value>)',
          800: 'rgb(var(--color-info-800)/<alpha-value>)',
          900: 'rgb(var(--color-info-900)/<alpha-value>)',
          950: 'rgb(var(--color-info-950)/<alpha-value>)',
        },
        typography: {
          0: 'rgb(var(--color-typography-0)/<alpha-value>)',
          50: 'rgb(var(--color-typography-50)/<alpha-value>)',
          100: 'rgb(var(--color-typography-100)/<alpha-value>)',
          200: 'rgb(var(--color-typography-200)/<alpha-value>)',
          300: 'rgb(var(--color-typography-300)/<alpha-value>)',
          400: 'rgb(var(--color-typography-400)/<alpha-value>)',
          500: 'rgb(var(--color-typography-500)/<alpha-value>)',
          600: 'rgb(var(--color-typography-600)/<alpha-value>)',
          700: 'rgb(var(--color-typography-700)/<alpha-value>)',
          800: 'rgb(var(--color-typography-800)/<alpha-value>)',
          900: 'rgb(var(--color-typography-900)/<alpha-value>)',
          950: 'rgb(var(--color-typography-950)/<alpha-value>)',
          white: 'rgb(var(--surface-role-onMedia)/<alpha-value>)',
          gray: 'rgb(var(--surface-role-muted)/<alpha-value>)',
          black: 'rgb(var(--surface-role-media)/<alpha-value>)',
        },
        outline: {
          0: 'rgb(var(--color-outline-0)/<alpha-value>)',
          50: 'rgb(var(--color-outline-50)/<alpha-value>)',
          100: 'rgb(var(--color-outline-100)/<alpha-value>)',
          200: 'rgb(var(--color-outline-200)/<alpha-value>)',
          300: 'rgb(var(--color-outline-300)/<alpha-value>)',
          400: 'rgb(var(--color-outline-400)/<alpha-value>)',
          500: 'rgb(var(--color-outline-500)/<alpha-value>)',
          600: 'rgb(var(--color-outline-600)/<alpha-value>)',
          700: 'rgb(var(--color-outline-700)/<alpha-value>)',
          800: 'rgb(var(--color-outline-800)/<alpha-value>)',
          900: 'rgb(var(--color-outline-900)/<alpha-value>)',
          950: 'rgb(var(--color-outline-950)/<alpha-value>)',
        },
        background: {
          0: 'rgb(var(--color-background-0)/<alpha-value>)',
          50: 'rgb(var(--color-background-50)/<alpha-value>)',
          100: 'rgb(var(--color-background-100)/<alpha-value>)',
          200: 'rgb(var(--color-background-200)/<alpha-value>)',
          300: 'rgb(var(--color-background-300)/<alpha-value>)',
          400: 'rgb(var(--color-background-400)/<alpha-value>)',
          500: 'rgb(var(--color-background-500)/<alpha-value>)',
          600: 'rgb(var(--color-background-600)/<alpha-value>)',
          700: 'rgb(var(--color-background-700)/<alpha-value>)',
          800: 'rgb(var(--color-background-800)/<alpha-value>)',
          900: 'rgb(var(--color-background-900)/<alpha-value>)',
          950: 'rgb(var(--color-background-950)/<alpha-value>)',
          error: 'rgb(var(--color-background-error)/<alpha-value>)',
          warning: 'rgb(var(--color-background-warning)/<alpha-value>)',
          muted: 'rgb(var(--color-background-muted)/<alpha-value>)',
          success: 'rgb(var(--color-background-success)/<alpha-value>)',
          info: 'rgb(var(--color-background-info)/<alpha-value>)',
          light: 'rgb(var(--surface-role-onMedia)/<alpha-value>)',
          dark: 'rgb(var(--surface-role-media)/<alpha-value>)',
        },
        indicator: {
          primary: 'rgb(var(--color-indicator-primary)/<alpha-value>)',
          info: 'rgb(var(--color-indicator-info)/<alpha-value>)',
          error: 'rgb(var(--color-indicator-error)/<alpha-value>)',
        },
        accent: {
          0: 'rgb(var(--color-accent-0)/<alpha-value>)',
          50: 'rgb(var(--color-accent-50)/<alpha-value>)',
          100: 'rgb(var(--color-accent-100)/<alpha-value>)',
          200: 'rgb(var(--color-accent-200)/<alpha-value>)',
          300: 'rgb(var(--color-accent-300)/<alpha-value>)',
          400: 'rgb(var(--color-accent-400)/<alpha-value>)',
          500: 'rgb(var(--color-accent-500)/<alpha-value>)',
          600: 'rgb(var(--color-accent-600)/<alpha-value>)',
          700: 'rgb(var(--color-accent-700)/<alpha-value>)',
          800: 'rgb(var(--color-accent-800)/<alpha-value>)',
          900: 'rgb(var(--color-accent-900)/<alpha-value>)',
          950: 'rgb(var(--color-accent-950)/<alpha-value>)',
        },

        // ---------------------------------------------------------------
        // Semantic aliases. Author against these, not the numbered scales
        // above: `bg-surface-raised` says what a surface is for, where
        // `bg-background-50` only says which step it landed on.
        //
        // These are aliases, not new colours — each points at the same CSS
        // variable the numbered scale does, so light/dark still flips in
        // one place (constants/colors.ts) and nothing needs a `dark:`
        // prefix. The numbered scales stay available as the escape hatch
        // for the genuine one-offs that have no semantic role.
        // ---------------------------------------------------------------

        /** Explicit surface roles; old aliases remain compatible with recessed controls. */
        surface: {
          base: 'rgb(var(--surface-role-paper)/<alpha-value>)',
          card: 'rgb(var(--surface-role-card)/<alpha-value>)',
          workspace: 'rgb(var(--surface-role-workspace)/<alpha-value>)',
          'workspace-card': 'rgb(var(--surface-role-workspaceCard)/<alpha-value>)',
          inset: 'rgb(var(--surface-role-well)/<alpha-value>)',
          overlay: 'rgb(var(--surface-role-overlay)/<alpha-value>)',
          selected: 'rgb(var(--surface-role-raised)/<alpha-value>)',
          raised: 'rgb(var(--surface-role-well)/<alpha-value>)',
          sunken: 'rgb(var(--surface-role-well)/<alpha-value>)',
          muted: 'rgb(var(--surface-role-raised)/<alpha-value>)',
        },
        paper: 'rgb(var(--surface-role-paper)/<alpha-value>)',
        card: 'rgb(var(--surface-role-card)/<alpha-value>)',
        overlay: 'rgb(var(--surface-role-overlay)/<alpha-value>)',
        well: 'rgb(var(--surface-role-well)/<alpha-value>)',
        ink: 'rgb(var(--surface-role-ink)/<alpha-value>)',
        tint: 'rgb(var(--surface-role-solid)/<alpha-value>)',
        'on-tint': 'rgb(var(--surface-role-onSolid)/<alpha-value>)',
        'tint-surface': 'rgb(var(--surface-role-raised)/<alpha-value>)',

        /** Text, by role rather than by darkness. */
        content: {
          primary: 'rgb(var(--color-typography-950)/<alpha-value>)',
          heading: 'rgb(var(--color-typography-900)/<alpha-value>)',
          body: 'rgb(var(--color-typography-700)/<alpha-value>)',
          secondary: 'rgb(var(--color-typography-500)/<alpha-value>)',
          tertiary: 'rgb(var(--color-typography-400)/<alpha-value>)',
          inverse: 'rgb(var(--color-typography-0)/<alpha-value>)',
        },

        /** Borders are hairlines or nothing. `border-stroke` is the form-field default. */
        stroke: {
          DEFAULT: 'rgb(var(--color-outline-200)/<alpha-value>)',
          hairline: 'rgb(var(--color-outline-0)/<alpha-value>)',
          subtle: 'rgb(var(--color-outline-50)/<alpha-value>)',
        },

        /**
         * The interactive colour. Reserved for primary actions, selected controls and focus.
         * Neutral content continues to use ink and the surface roles.
         */
        action: {
          DEFAULT: 'rgb(var(--color-primary-500)/<alpha-value>)',
          pressed: 'rgb(var(--color-primary-600)/<alpha-value>)',
        },

        /** The only place colour is allowed to carry meaning. */
        status: {
          online: 'rgb(var(--color-status-online)/<alpha-value>)',
          offline: 'rgb(var(--color-typography-400)/<alpha-value>)',
          busy: 'rgb(var(--color-warning-500)/<alpha-value>)',
          downloading: 'rgb(var(--color-info-500)/<alpha-value>)',
          danger: 'rgb(var(--color-error-500)/<alpha-value>)',
          'danger-pressed': 'rgb(var(--color-error-600)/<alpha-value>)',
        },
      },
      fontFamily: {
        heading: ['Barlow'],
        body: ['Barlow'],
        sans: ['Barlow'],
        // Legacy alias shares the body family; use tabular-nums for dynamic readouts.
        mono: ['Barlow'],
        // Legacy title aliases use the same Barlow family.
        serif: ['BarlowSemiBold'],
        'serif-italic': ['BarlowItalic'],
        'serif-semibold': ['BarlowSemiBold'],
      },
      fontSize: {
        '2xs': '10px',
      },
      boxShadow: {
        'hard-1': '-2px 2px 8px 0px rgba(38, 38, 38, 0.20)',
        'hard-2': '0px 3px 10px 0px rgba(38, 38, 38, 0.20)',
        'hard-3': '2px 2px 8px 0px rgba(38, 38, 38, 0.20)',
        'hard-4': '0px -3px 10px 0px rgba(38, 38, 38, 0.20)',
        'hard-5': '0px 2px 10px 0px rgba(38, 38, 38, 0.10)',
        'soft-1': '0px 0px 10px rgba(38, 38, 38, 0.1)',
        'soft-2': '0px 0px 20px rgba(38, 38, 38, 0.2)',
        'soft-3': '0px 0px 30px rgba(38, 38, 38, 0.1)',
        'soft-4': '0px 0px 40px rgba(38, 38, 38, 0.1)',
      },
    },
  },
  plugins: [gluestackPlugin],
};
