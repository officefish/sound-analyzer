export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./electron/**/*.{js,ts}",
    'node_modules/daisyui/dist/**/*.js',
    'node_modules/react-daisyui/dist/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
      },
      animation: {
        'glow': 'glow 1.5s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { textShadow: '0 0 10px rgba(0, 255, 136, 0.5)' },
          '50%': { textShadow: '0 0 20px rgba(0, 255, 136, 0.8)' },
        }
      },
      colors: {
        "primary-dark": "color-mix(in oklab, oklch(var(--p)), black 15%)",
      },
    },
  },
  plugins: [
    require("daisyui"),
  ],
  daisyui: {
    themes: ["dark"], // ✅ Явно указываем только тёмную тему
    darkTheme: "dark", // ✅ Указываем тему по умолчанию
    base: true, // ✅ Применяем базовые стили daisyui
    styled: true, // ✅ Применяем стили компонентов
    utils: true, // ✅ Включаем утилиты
    logs: false, // ✅ Отключаем логи в консоли
  },
}