import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default ['generate-graph.js', 'reconstruct-graph.js'].map(x => {
  return {
    input: `lib/${x}`,
    output: {
      file: `dist/${x}`,
      format: 'es',
      esModule: false,
      interop: 'compat'
    },
    plugins: [resolve(), commonjs({ defaultIsModuleExports: true }), json()]
  }
});