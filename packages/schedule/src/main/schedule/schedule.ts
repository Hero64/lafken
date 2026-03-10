import { createLambdaDecorator, createResourceDecorator } from '@lafken/common';
import type { EventCronMetadata, EventCronProps } from './schedule.types';

export const RESOURCE_TYPE = 'CRON' as const;

/**
 * Class decorator that registers a class as a scheduled event resource.
 *
 * The decorated class groups one or more `@Cron` handler methods that
 * are invoked on a time-based schedule via Amazon EventBridge.
 *
 * @param props - Optional resource configuration (e.g. a custom `name`).
 *
 * @example
 * ```ts
 * @Schedule()
 * export class MaintenanceJobs {
 *   @Cron({ schedule: { hour: 3, minute: 0 } })
 *   cleanup() { }
 * }
 * ```
 */
export const Schedule = createResourceDecorator({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
});

/**
 * Method decorator that registers a handler to run on a cron schedule.
 *
 * The decorated method becomes a Lambda function invoked automatically
 * by EventBridge at the times defined by the `schedule` option. The
 * schedule can be a standard AWS cron string or a structured
 * `ScheduleTime` object.
 *
 * @param props - Schedule configuration (schedule expression, maxEventAge,
 *                retryAttempts).
 *
 * @example
 * ```ts
 * // Using a cron string (every day at midnight UTC)
 * @Cron({ schedule: 'cron(0 0 * * ? *)' })
 * dailyReport() { }
 *
 * // Using a ScheduleTime object (every Monday at 8:30 AM)
 * @Cron({ schedule: { weekDay: 'MON', hour: 8, minute: 30 } })
 * weeklyDigest() { }
 * ```
 */
export const Cron = (props: EventCronProps) =>
  createLambdaDecorator<EventCronProps, EventCronMetadata>({
    getLambdaMetadata: (props, methodName) => ({
      ...props,
      name: methodName,
    }),
  })(props);
