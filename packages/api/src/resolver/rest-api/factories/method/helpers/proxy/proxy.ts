import type { ApiParamMetadata } from '../../../../../../main';
import type {
  ProxyResolveObjectKeyValue,
  ProxySegment,
  ProxyValueResolver,
} from './proxy.types';
import { getVariableFieldType } from './proxy.utils';

/**
 * Control character used to delimit a proxy path when the proxy is coerced to a
 * string (e.g. inside a template literal like `` `data/${e.file}` ``). It lets us
 * later recover which parts of the resulting string came from the event proxy and
 * which are static literals. It is never expected to appear in real content.
 */
export const PROXY_MARKER = '\u0000';

const stripMarkers = (value: string) => value.split(PROXY_MARKER).join('');

export class ProxyHelper {
  createEvent = (path = '') => {
    return new Proxy(() => {}, {
      get: (_: any, prop: string | symbol): any => {
        if (typeof prop === 'symbol') {
          if (prop === Symbol.toPrimitive) {
            if (/\.\d+/.test(path)) {
              throw new Error(`Invalid path: "${path}" do not accept arrays.`);
            }

            return () => `${PROXY_MARKER}${path}${PROXY_MARKER}`;
          }
          return undefined;
        }

        if (prop === '__isProxy') {
          return true;
        }

        if (prop === 'then') {
          return undefined;
        }

        const newPath = path ? `${path}.${prop}` : prop;
        return this.createEvent(newPath);
      },
    });
  };

  /**
   * Split a value into ordered literal/proxy segments. Accepts a raw proxy
   * (`e.file`), a plain literal (`'test.json'`) or a template literal that mixes
   * both (`` `data/temp/${e.file}` ``). Proxy segments carry the event path.
   */
  segments(value: any): ProxySegment[] {
    return `${value}`
      .split(PROXY_MARKER)
      .map((part, index) => ({ isProxy: index % 2 === 1, value: part }))
      .filter((segment) => segment.isProxy || segment.value !== '');
  }

  resolveProxyValue(
    value: any,
    fieldParamsPaths: Record<string, ApiParamMetadata>
  ): ProxyValueResolver {
    if (value.isProxy) {
      const path = stripMarkers(`${value}`);
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
      value: typeof value === 'string' ? stripMarkers(value) : value,
      field: undefined,
      path: undefined,
      type: getVariableFieldType(value),
    };
  }

  resolveObjectKeyValue(
    value: any,
    fieldParamsPaths: Record<string, ApiParamMetadata>
  ): ProxyResolveObjectKeyValue {
    if (value.isProxy) {
      throw new Error(`Value ${value} is not supported`);
    }

    if (typeof value !== 'object') {
      throw new Error('Key should be and object');
    }
    const key = Object.keys(value)[0];

    if (!key) {
      throw new Error('Should define a value');
    }

    return {
      ...(this.resolveProxyValue(value[key], fieldParamsPaths) as ProxyValueResolver),
      key,
    };
  }
}
