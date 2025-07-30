module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  prefix: 'tw-',
  variants: {
    extend: {},
  },
  plugins: [],
  theme: {
    listStyleType: {
      none: 'disc',
      disc: 'disc',
      decimal: 'decimal',
      square: 'square',
      roman: 'upper-roman',
    },
    extend: {
      colors: {
        lila: {
          DEFAULT: '#BB93DD',
        },
        verde: {
          DEFAULT: '#71E4D1',
        },
        gris: {
          DEFAULT: '#9E9E9E',
        },
      },
      fontFamily: {
        lora: ['var(--Lora, "Lora")'],
      },
      transitionProperty: {
        width: 'width',
      },
    },
  },
};
