// tailwind.config.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { heroui } = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/components/*.js",
    "./node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      spacing: {
        'section-gap': '2.5rem',
      },
      backgroundColor: {
        'app-bg': '#f8fafc', // 淺灰背景色
        'card-bg': '#ffffff', // 卡片背景色
        'dark-app-bg': '#121212', // 深色模式背景
        'dark-card-bg': '#1e1e1e', // 深色模式卡片背景
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      layout: {
        radius: {
          small: "0.25rem",  // 4px
          medium: "0.5rem",  // 8px
          large: "0.75rem",  // 12px
        },
        spacing: {
          small: "0.75rem",   // 12px
          medium: "1.25rem",    // 20px
          large: "2rem",   // 32px
        },
      },
      themes: {
        light: {
          layout: {
            boxShadow: {
              small: "0 1px 3px rgba(0,0,0,0.1)",
              medium: "0 4px 8px rgba(0,0,0,0.1)",
              large: "0 8px 16px rgba(0,0,0,0.1)",
            },
          },
          colors: {
            background: "#FFFFFF",
            foreground: "#11181C",
            divider: "#E4E4E7",
            
            // 主色調
            primary: {
              50: '#EBF5FF',
              100: '#CCE5FF',
              200: '#99CCFF',
              300: '#66B2FF',
              400: '#3399FF',
              500: '#0080FF', // 主色
              600: '#0066CC',
              700: '#004D99',
              800: '#003366',
              900: '#001A33',
            },
            
            // 輔助色調
            secondary: {
              50: '#F5F3FF',
              100: '#EDE9FE',
              200: '#DDD6FE',
              300: '#C4B5FD',
              400: '#A78BFA',
              500: '#8B5CF6', // 主色
              600: '#7C3AED',
              700: '#6D28D9',
              800: '#5B21B6',
              900: '#4C1D95',
            },
            
            // 功能色
            success: {
              50: '#F0FDF4',
              100: '#DCFCE7',
              200: '#BBF7D0',
              300: '#86EFAC',
              400: '#4ADE80',
              500: '#22C55E', // 主色
              600: '#16A34A',
              700: '#15803D',
              800: '#166534',
              900: '#14532D',
            },
            
            warning: {
              50: '#FFFBEB',
              100: '#FEF3C7',
              200: '#FDE68A',
              300: '#FCD34D',
              400: '#FBBF24',
              500: '#F59E0B', // 主色
              600: '#D97706',
              700: '#B45309',
              800: '#92400E',
              900: '#78350F',
            },
            
            danger: {
              50: '#FEF2F2',
              100: '#FEE2E2',
              200: '#FECACA',
              300: '#FCA5A5',
              400: '#F87171',
              500: '#EF4444', // 主色
              600: '#DC2626',
              700: '#B91C1C',
              800: '#991B1B',
              900: '#7F1D1D',
            },

            default: {
              50: '#F9FAFB',
              100: '#F3F4F6',
              200: '#E5E7EB',
              300: '#D1D5DB',
              400: '#9CA3AF',
              500: '#6B7280',
              600: '#4B5563',
              700: '#374151',
              800: '#1F2937',
              900: '#111827',
            },
          }
        },
        dark: {
          layout: {
            boxShadow: {
              small: "0 2px 5px rgba(0,0,0,0.4)",
              medium: "0 5px 10px rgba(0,0,0,0.35)",
              large: "0 12px 24px rgba(0,0,0,0.3)",
            },
          },
          colors: {
            background: "#0A0A0A",
            foreground: "#ECEDEE",
            divider: "#27272A",
            
            // 主色調
            primary: {
              50: '#EBF5FF',
              100: '#CCE5FF',
              200: '#99CCFF',
              300: '#66B2FF',
              400: '#3399FF',
              500: '#0080FF', // 主色
              600: '#0066CC',
              700: '#004D99',
              800: '#003366',
              900: '#001A33',
            },
            
            // 輔助色調
            secondary: {
              50: '#F5F3FF',
              100: '#EDE9FE',
              200: '#DDD6FE',
              300: '#C4B5FD',
              400: '#A78BFA',
              500: '#8B5CF6', // 主色
              600: '#7C3AED',
              700: '#6D28D9',
              800: '#5B21B6',
              900: '#4C1D95',
            },
            
            // 功能色
            success: {
              50: '#F0FDF4',
              100: '#DCFCE7',
              200: '#BBF7D0',
              300: '#86EFAC',
              400: '#4ADE80',
              500: '#22C55E', // 主色
              600: '#16A34A',
              700: '#15803D',
              800: '#166534',
              900: '#14532D',
            },
            
            warning: {
              50: '#FFFBEB',
              100: '#FEF3C7',
              200: '#FDE68A',
              300: '#FCD34D',
              400: '#FBBF24',
              500: '#F59E0B', // 主色
              600: '#D97706',
              700: '#B45309',
              800: '#92400E',
              900: '#78350F',
            },
            
            danger: {
              50: '#FEF2F2',
              100: '#FEE2E2',
              200: '#FECACA',
              300: '#FCA5A5',
              400: '#F87171',
              500: '#EF4444', // 主色
              600: '#DC2626',
              700: '#B91C1C',
              800: '#991B1B',
              900: '#7F1D1D',
            },

            default: {
              50: '#18181B',
              100: '#27272A',
              200: '#3F3F46',
              300: '#52525B',
              400: '#71717A',
              500: '#A1A1AA',
              600: '#D4D4D8',
              700: '#E4E4E7',
              800: '#F4F4F5',
              900: '#FAFAFA',
            },
          }
        }
      }
    }),
  ],
};