import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      spacing: {
        'section-gap': '2.5rem',
      },
      backgroundColor: {
        'app-bg': '#f8fafc', // 浅灰背景色
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
              small: "0 1px 3px rgba(0,0,0,0.07)",
              medium: "0 4px 8px rgba(0,0,0,0.05)",
              large: "0 8px 16px rgba(0,0,0,0.04)",
            },
          },
          colors: {
            background: "#FFFFFF",
            foreground: "#1a202c",
            divider: "#e2e8f0",
            
            // 以中蓝色为主色调
            primary: {
              50: '#EBF8FF',
              100: '#D1EEFC',
              200: '#A7D8F0',
              300: '#7CC1E4',
              400: '#55AAD4',
              500: '#3182CE', // 主色
              600: '#2B6CB0',
              700: '#2C5282',
              800: '#2A4365',
              900: '#1A365D',
            },
            
            // 紫蓝色为辅助色
            secondary: {
              50: '#EBF4FF',
              100: '#C3DAFE',
              200: '#A3BFFA',
              300: '#7F9CF5',
              400: '#667EEA',
              500: '#5A67D8', // 主色
              600: '#4C51BF',
              700: '#434190',
              800: '#3C366B',
              900: '#302E53',
            },
            
            // 功能色
            success: {
              50: '#F0FFF4',
              100: '#C6F6D5',
              200: '#9AE6B4',
              300: '#68D391',
              400: '#48BB78',
              500: '#38A169', // 主色
              600: '#2F855A',
              700: '#276749',
              800: '#22543D',
              900: '#1C4532',
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
            background: "#121212",
            foreground: "#e2e8f0",
            divider: "#2d3748",
            
            // 深色模式主色调
            primary: {
              50: '#EBF8FF',
              100: '#D1EEFC',
              200: '#A7D8F0',
              300: '#7CC1E4',
              400: '#55AAD4',
              500: '#3182CE', // 主色
              600: '#2B6CB0',
              700: '#2C5282',
              800: '#2A4365',
              900: '#1A365D',
            },
            
            // 辅助色调
            secondary: {
              50: '#EBF4FF',
              100: '#C3DAFE',
              200: '#A3BFFA',
              300: '#7F9CF5',
              400: '#667EEA',
              500: '#5A67D8', // 主色
              600: '#4C51BF',
              700: '#434190',
              800: '#3C366B',
              900: '#302E53',
            },
            
            // 功能色保持一致
            success: {
              50: '#F0FFF4',
              100: '#C6F6D5',
              200: '#9AE6B4',
              300: '#68D391',
              400: '#48BB78',
              500: '#38A169', // 主色
              600: '#2F855A',
              700: '#276749',
              800: '#22543D',
              900: '#1C4532',
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
          }
        }
      }
    }),
  ],
};

export default config; 