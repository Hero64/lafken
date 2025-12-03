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
        let exportContent = '';

        for (const exportResources of props.exports) {
          const instanceName = `${exportResources.className}Instance`;
          const instance = `const ${instanceName} = new ${exportResources.className}()`;

          const exports = exportResources.methods.map((handler) => {
            return `exports.${handler}_${exportResources.className} = ${instanceName}.${handler}.bind(${instanceName})`;
          });
          exportContent += `\n${instance}\n${exports.join('\n')}\n;`;
        }

        source += exportContent;

        return {
          contents: source,
          loader: 'js',
        };
      });
    },
  };
};
