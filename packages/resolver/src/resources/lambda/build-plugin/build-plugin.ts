import { promises } from 'node:fs';
import type { Plugin } from 'esbuild';
import type { AlicantoBuildPluginProps } from './build-plugin.types';

export const AlicantoBuildPlugin = (props: AlicantoBuildPluginProps): Plugin => {
  const fileRegex = new RegExp(`${props.filename.replace('.', '\\.')}\\.js$`);

  return {
    name: 'alicanto-build-plugin',
    setup(build) {
      build.onLoad({ filter: fileRegex }, async (args) => {
        let source = await promises.readFile(args.path, 'utf8');

        const instanceName = `${props.export.className}Instance`;
        const instance = `const ${instanceName} = new ${props.export.className}()`;

        const exports = props.export.methods.map((handler) => {
          return `exports.${handler} = ${instanceName}.${handler}.bind(${instanceName})`;
        });

        source += `\n${instance}\n${exports.join('\n')}\n;`;

        return {
          contents: source,
          loader: 'js',
        };
      });
    },
  };
};
