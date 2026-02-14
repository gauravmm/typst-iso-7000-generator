export default {
  multipass: true, // boolean
  js2svg: {
    indent: 4, // number
    pretty: false, // boolean
  },
  floatPrecision: 1,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          convertColors: {
            shortHex: true,
          },
          convertPathData: { applyTransforms: true },
          convertTransform: true,
        },
      },
    },
  ],

};