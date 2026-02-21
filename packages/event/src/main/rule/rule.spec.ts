import {
  enableBuildEnvVariable,
  getResourceHandlerMetadata,
  getResourceMetadata,
} from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { EventRule, Rule } from './rule';

describe('Cron rule', () => {
  enableBuildEnvVariable();

  it('should exist a EventRule resource decorator metadata', () => {
    @EventRule({})
    class RuleTest {}

    const metadata = getResourceMetadata(RuleTest);

    expect(metadata).toMatchObject({
      name: 'RuleTest',
      originalName: 'RuleTest',
      type: 'EVENT',
      minify: true,
    });
  });

  it('should exist a Rule decorator metadata', () => {
    @EventRule({})
    class CronTest {
      @Rule({
        pattern: {
          source: 'test',
        },
      })
      rule() {}
    }

    const metadata = getResourceHandlerMetadata(CronTest);
    expect(metadata).toContainEqual({
      eventType: 'rule',
      name: 'rule',
      pattern: { source: 'test' },
    });
  });
});
