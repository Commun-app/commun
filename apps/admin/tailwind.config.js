module.exports = {
  darkMode: 'class',
  content: [
    './node_modules/@poulpus/prose/dist/runtime/components/**/*.{vue,js,ts}',
    './node_modules/@poulpus/prose/dist/runtime/extensions/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './plugins/**/*.{vue,js,ts}',
    './nuxt.config.{js,ts}'
  ],
  theme: {
    extend: {
      fontSize: {
        '7xs': '.125rem',
        '6xs': '.25rem',
        '5xs': '.375rem',
        '4xs': '.5rem',
        '3xs': '.625rem',
        '2xs': '.75rem'
      },
      colors: {
        primary: '#000'
      }
    }
  },
  // variants: {
  //   extend: {

  //   }
  // },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/typography')
  ]
}
