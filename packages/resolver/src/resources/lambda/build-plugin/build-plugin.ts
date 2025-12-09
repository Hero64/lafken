import type { LafkenBuildPluginProps } from './build-plugin.types';

export const LafkenBuildPlugin = (props: LafkenBuildPluginProps) => {
  return {
    name: 'lafken-build-plugin',
    transform(code: string, id: string) {
      if (id === props.filename) {
        let exportContent = '';

        for (const exportResources of props.exports) {
          const instanceName = `${exportResources.className}Instance`;
          const instance = `const ${instanceName} = new ${exportResources.className}();`;
          const exports = exportResources.methods.map((handler) => {
            return `exports.${handler}_${exportResources.className} = ${instanceName}.${handler}.bind(${instanceName});`;
          });
          exportContent += `\n${instance}\n${exports.join('\n')}\n`;
        }

        return {
          code: code + exportContent,
          map: null,
        };
      }
    },
  };
};
