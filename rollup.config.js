import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/umd/vue-monitor.js', format: 'umd', name: 'VueMonitor' },
    { file: 'dist/esm/index.js', format: 'esm' },
    { file: 'dist/cjs/index.js', format: 'cjs' }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          outDir: 'dist',
          declaration: true,
          declarationDir: 'dist/types',
          emitDeclarationOnly: false
        },
        include: ['src/**/*']
      },
      useTsconfigDeclarationDir: true,
      clean: true
    })
  ]
};
