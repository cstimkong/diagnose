import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
export default [{
  input: 'lib/generate-graph.js',
  output: {
    file: 'dist/generate-graph.js',
    format: 'es',
    esModule: false,
    interop: 'compat'
  },
  plugins: [resolve(), commonjs({defaultIsModuleExports: true}), json()]
}];