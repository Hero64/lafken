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
          const streamingMethods = new Set(exportResources.streamingMethods ?? []);
          const exports = exportResources.methods.map((handler) => {
            const exportName = `${handler}_${exportResources.className}`;
            const boundHandler = `${instanceName}.${handler}.bind(${instanceName})`;
            // Streaming handlers are wrapped here (after binding) so the marker
            // `awslambda.streamifyResponse` sets lands on the final exported
            // function — the Lambda runtime inspects that exact object to detect
            // response streaming.
            const value = streamingMethods.has(handler)
              ? `awslambda.streamifyResponse(${boundHandler})`
              : boundHandler;
            return `exports.${exportName} = ${value};`;
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
