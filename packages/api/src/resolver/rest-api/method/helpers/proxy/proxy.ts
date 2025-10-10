import type { ApiParamMetadata } from '../../../../../main';
import type { ProxyValueResolver } from './proxy.types';
import { getVariableFieldType } from './proxy.utils';

export class ProxyHelper {
  createEvent = (path = '') => {
    return new Proxy(() => {}, {
      get: (_: any, prop: string | symbol): any => {
        if (typeof prop === 'symbol') {
          if (prop === Symbol.toPrimitive) {
            if (/\.\d+/.test(path)) {
              throw new Error(`Invalid path: "${path}" do not accept arrays.`);
            }

            return () => path;
          }
          return undefined;
        }

        if (prop === '__isProxy') {
          return true;
        }

        const newPath = path ? `${path}.${prop}` : prop;
        return this.createEvent(newPath);
      },
    });
  };

  resolveProxyValue(
    value: any,
    fieldParamsPaths: Record<string, ApiParamMetadata>
  ): ProxyValueResolver {
    if (value.isProxy) {
      const path = `${value}`;
      const eventValue = fieldParamsPaths[path];
      if (!eventValue) {
        throw new Error(`The value for the path ${path} does not exist.`);
      }

      return {
        value,
        path,
        field: eventValue,
        type: eventValue.type,
      };
    }

    return {
      value,
      field: undefined,
      path: undefined,
      type: getVariableFieldType(value),
    };
  }
}
