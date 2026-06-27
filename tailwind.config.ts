import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rtm: {
          bg:       '#080a0f',
          surface:  '#0d1017',
          card:     '#111520',
          border:   '#1a2230',
          accent:   '#7b5ea7',
          purple:   '#9d7fd4',
          green:    '#00e5a0',
          amber:    '#f0a500',
          red:      '#ff4455',
          text:     '#c0cce0',
          muted:    '#4a5a70',
        },
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
        head: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1.2s infinite',
        'slide-down': 'slideDown 0.3s ease',
        'fade-in': 'fadeIn 0.2s ease',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.15' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
