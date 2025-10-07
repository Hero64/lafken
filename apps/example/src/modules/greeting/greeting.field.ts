import { Field, Param, Payload, Response } from '@alicanto/api/main';

@Payload()
export class BaseEvent {
  @Param({
    source: 'path',
  })
  id: number;
}

@Payload()
export class HelloEvent extends BaseEvent {
  @Param({
    source: 'query',
  })
  name: string;
}

@Response()
export class HelloResponse {
  @Field()
  name: string;

  @Field()
  date: string;
}

@Payload()
export class ByeEvent extends HelloEvent {
  @Param({
    source: 'query',
  })
  lastName: string;

  @Param({
    source: 'path',
  })
  type: number;
}

@Payload()
export class Bye404 {
  @Field()
  foo: string;
}

@Payload()
export class Bye307 {
  @Field()
  bar: string;
}

@Response({
  responses: {
    404: Bye404,
    307: Bye307,
  },
})
export class ByeResponse {
  @Field()
  fullName: string;

  @Field()
  id: number;
}

@Payload()
export class NewGreetingEvent extends BaseEvent {
  @Param({
    source: 'body',
  })
  name: string;

  @Param({
    source: 'body',
  })
  lastName: string;
}

@Payload()
export class S3DownloadEvent extends BaseEvent {
  @Param({
    source: 'path',
  })
  file: string;
}

@Payload()
export class DynamoQueryEvent extends BaseEvent {
  @Param({
    source: 'path',
  })
  dni: number;
}

@Payload()
export class DynamoPutEvent extends BaseEvent {
  @Param({
    source: 'body',
  })
  dni: number;

  @Param({
    source: 'body',
  })
  name: string;
}

@Payload()
export class DynamoUpdateEvent extends DynamoPutEvent {
  @Param({
    source: 'body',
    required: false,
  })
  date?: string;
}

@Payload()
export class DynamoDeleteEvent extends DynamoQueryEvent {
  @Param({
    source: 'query',
  })
  name: string;
}
