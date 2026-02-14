export default {
  multipass: true, // boolean
  js2svg: {
    indent: 4, // number
    pretty: false, // boolean
  },
  plugins: [
    'preset-default', // built-in plugins enabled by default
  ],
  params: {
    overrides: {
      removeViewBox: false, // Prevents removing the viewBox
    },
  },

};