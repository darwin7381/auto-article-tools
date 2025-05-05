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
              small: "0 1px 3px rgba(0,0,0,0.1)",
              medium: "0 4px 8px rgba(0,0,0,0.1)",
              large: "0 8px 16px rgba(0,0,0,0.1)",
            },
          },
          colors: {
            background: "#FFFFFF",
            foreground: "#111827", // 更深的文本颜色，提高对比度
            divider: "#d1d5db", // 更显眼的分隔线
            
            // 以中蓝色为主色调 - 增强亮色模式对比度
            primary: {
              50: '#EBF8FF',
              100: '#D1EEFC',
              200: '#A7D8F0',
              300: '#7CC1E4',
              400: '#55AAD4',
              500: '#0369A1', // 更深的蓝色作为主色
              600: '#0284C7',
              700: '#0369A1',
              800: '#075985',
              900: '#0C4A6E',
            },
            
            // 紫蓝色为辅助色 - 增强亮色模式对比度
            secondary: {
              50: '#EEF2FF',
              100: '#E0E7FF',
              200: '#C7D2FE',
              300: '#A5B4FC',
              400: '#818CF8',
              500: '#4F46E5', // 更深的紫色作为主色
              600: '#4338CA',
              700: '#3730A3',
              800: '#312E81',
              900: '#1E1B4B',
            },
            
            // 功能色 - 维持好的对比度
            success: {
              50: '#F0FFF4',
              100: '#C6F6D5',
              200: '#9AE6B4',
              300: '#68D391',
              400: '#48BB78',
              500: '#16A34A', // 更深的绿色作为主色
              600: '#15803D',
              700: '#166534',
              800: '#14532D',
              900: '#052E16',
            },
            
            warning: {
              50: '#FFFBEB',
              100: '#FEF3C7',
              200: '#FDE68A',
              300: '#FCD34D',
              400: '#FBBF24',
              500: '#D97706', // 更深的橙色作为主色
              600: '#B45309',
              700: '#92400E',
              800: '#78350F',
              900: '#451A03',
            },
            
            danger: {
              50: '#FEF2F2',
              100: '#FEE2E2',
              200: '#FECACA',
              300: '#FCA5A5',
              400: '#F87171',
              500: '#DC2626', // 更深的红色作为主色
              600: '#B91C1C',
              700: '#991B1B',
              800: '#7F1D1D',
              900: '#450A0A',
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