import { response } from './status';
import { HTTP_STATUS_CODE } from './status.types';

describe('response', () => {
  it('should throw an error with correct structure when called', () => {
    const code = 404;
    const data = { id: 123 };

    try {
      response(code, data);
    } catch (err: any) {
      expect(err).toBeInstanceOf(Error);

      const parsed = JSON.parse(err.message);

      expect(parsed).toEqual({
        res: HTTP_STATUS_CODE[code],
        data,
      });
    }
  });

  it('should default data to empty object if not provided', () => {
    const code = 200;

    try {
      response(code);
    } catch (err: any) {
      const parsed = JSON.parse(err.message);

      expect(parsed).toEqual({
        res: HTTP_STATUS_CODE[code],
        data: {},
      });
    }
  });

  it('should work with different status codes', () => {
    const codes: (keyof typeof HTTP_STATUS_CODE)[] = [201, 500];

    for (const code of codes) {
      try {
        response(code, { foo: 'bar' });
      } catch (err: any) {
        const parsed = JSON.parse(err.message);

        expect(parsed.res).toBe(HTTP_STATUS_CODE[code]);
        expect(parsed.data).toEqual({ foo: 'bar' });
      }
    }
  });
});
