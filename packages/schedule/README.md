# @lafken/schedule

Define Amazon EventBridge scheduled rules using TypeScript decorators. `@lafken/schedule` lets you declare cron-based tasks directly on class methods — each one becomes a Lambda function invoked automatically by EventBridge at the specified times.

## Installation

```bash
npm install @lafken/schedule
```

## Getting Started

Define a schedule class with `@Schedule`, add `@Cron` methods, and register it through `ScheduleResolver`:

```typescript
import { createApp, createModule } from '@lafken/main';
import { ScheduleResolver } from '@lafken/schedule/resolver';
import { Schedule, Cron } from '@lafken/schedule/main';

// 1. Define scheduled tasks
@Schedule()
export class MaintenanceJobs {
  @Cron({ schedule: 'cron(0 3 * * ? *)' })
  cleanupExpiredSessions() {
    // Runs every day at 3:00 AM UTC
  }

  @Cron({ schedule: { hour: 0, minute: 0, weekDay: 'SUN' } })
  generateWeeklyReport() {
    // Runs every Sunday at midnight UTC
  }
}

// 2. Register in a module
const maintenanceModule = createModule({
  name: 'maintenance',
  resources: [MaintenanceJobs],
});

// 3. Add the resolver to the app
createApp({
  name: 'my-app',
  resolvers: [new ScheduleResolver()],
  modules: [maintenanceModule],
});
```

Each `@Cron` method becomes an independent Lambda function with its own EventBridge rule.

## Features

### Schedule Class

Use the `@Schedule` decorator to group related cron tasks in a single class. The class itself holds no schedule logic — it acts as a container for `@Cron` handlers:

```typescript
import { Schedule, Cron } from '@lafken/schedule/main';

@Schedule()
export class DataPipeline {
  @Cron({ schedule: 'cron(0 6 * * ? *)' })
  ingestData() { }

  @Cron({ schedule: 'cron(30 6 * * ? *)' })
  transformData() { }
}
```

### Cron Expression (String)

Pass a standard AWS cron expression as a string. The format follows:

```
cron(Minutes Hours Day-of-month Month Day-of-week Year)
```

```typescript
@Cron({ schedule: 'cron(0 12 * * ? *)' })
sendDailyDigest() {
  // Every day at 12:00 PM UTC
}

@Cron({ schedule: 'cron(0 9 1 * ? *)' })
generateMonthlyInvoice() {
  // First day of every month at 9:00 AM UTC
}
```

> [!NOTE]
> AWS cron expressions require either the day-of-month or day-of-week field to be `?`. You cannot specify both simultaneously. When using a cron string, include the full `cron(...)` wrapper.

### Cron Expression (Object)

For a more readable alternative, use the `ScheduleTime` object format. Each field defaults to `'*'` when omitted:

```typescript
@Cron({
  schedule: {
    minute: 0,
    hour: 8,
    weekDay: 'MON-FRI',
  },
})
startBusinessHours() {
  // Every weekday at 8:00 AM UTC
}

@Cron({
  schedule: {
    minute: 30,
    hour: 22,
    day: 15,
  },
})
midMonthAudit() {
  // 15th of every month at 10:30 PM UTC
}
```

#### ScheduleTime Fields

| Field     | Type                        | Default | Description          |
| --------- | --------------------------- | ------- | -------------------- |
| `minute`  | `number \| '*' \| '?'`     | `'*'`   | Minute (0–59)        |
| `hour`    | `number \| '*' \| '?'`     | `'*'`   | Hour (0–23)          |
| `day`     | `number \| '*' \| '?'`     | `'*'`   | Day of month (1–31)  |
| `month`   | `number \| '*' \| '?'`     | `'*'`   | Month (1–12)         |
| `weekDay` | `number \| string \| '?'`  | `'*'`   | Day of week (SUN–SAT or 1–7) |
| `year`    | `number \| '*' \| '?'`     | `'*'`   | Year                 |

When `day` is set to a specific value, `weekDay` is automatically set to `'?'` and vice versa, following the AWS cron constraint.

### Retry Policy

Configure how EventBridge handles failed deliveries using `retryAttempts` and `maxEventAge`:

```typescript
@Cron({
  schedule: 'cron(0 0 * * ? *)',
  retryAttempts: 3,
  maxEventAge: 3600,
})
criticalNightlyJob() {
  // Retries up to 3 times, discards events older than 1 hour
}
```

| Option          | Type     | Description                                                |
| --------------- | -------- | ---------------------------------------------------------- |
| `retryAttempts` | `number` | Maximum retry attempts if the target invocation fails      |
| `maxEventAge`   | `number` | Maximum event age in seconds before the event is discarded |
