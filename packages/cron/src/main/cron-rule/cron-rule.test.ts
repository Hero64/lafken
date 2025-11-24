import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@alicanto/common';
import { Cron, Schedule } from './cron-rule';

describe('Cron rule', () => {
  enableBuildEnvVariable();

  it('should exist a Schedule resource decorator metadata', () => {
    @Schedule({})
    class CronTest {}

    const metadata = getResourceMetadata(CronTest);

    expect(metadata).toMatchObject({
      type: 'CRON',
      name: 'CronTest',
      filename: 'cron-rule.test.ts',
      originalName: 'CronTest',
      minify: true,
    });
  });

  it('should exist a Cron decorator metadata', () => {
    @Schedule({})
    class CronTest {
      @Cron({
        schedule: {
          day: 10,
          minute: 10,
        },
      })
      cron() {}
    }

    const metadata = getResourceHandlerMetadata(CronTest);
    expect(metadata).toContainEqual({ schedule: { day: 10, minute: 10 }, name: 'cron' });
  });
});
