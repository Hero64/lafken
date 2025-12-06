import { Field, Param, Payload, Response } from '@alicanto/api/main';
import {
  Field as QueueField,
  Param as QueueParam,
  Payload as QueuePayload,
} from '@alicanto/queue/main';
import { Param as SMParam, Payload as SMPayload } from '@alicanto/state-machine/main';
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
export class Data {
  @Field()
  name: string;
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

  @Param({
    source: 'body',
    type: Data,
  })
  data: Data;

  @Param({
    source: 'body',
    type: [Data],
  })
  listData: Data[];

  @Param({
    source: 'query',
    type: [Number],
  })
  numbers: number[];
}

@Payload()
export class S3UploadFileEvent {
  @Param({
    source: 'path',
  })
  fileName: string;
}

@Payload()
export class DynamoPkEvent {
  @Param()
  email: string;

  @Param({
    validation: {
      required: false,
      maximum: 1000,
    },
  })
  name: string;
}

@Payload()
export class DynamoPutEvent {
  @Param({
    source: 'body',
  })
  email: string;

  @Param({
    source: 'body',
  })
  name: string;

  @Param({
    source: 'body',
  })
  age: number;
}

@Payload()
export class StateMachineInput {
  @Param({
    source: 'body',
  })
  name: string;

  @Param({
    source: 'body',
    type: [Number],
  })
  list: number[];
}

@Payload()
export class StateMachineExecutionId {
  @Param({
    source: 'path',
  })
  id: string;
}

@SMPayload()
export class StateMachinePayload {
  @SMParam({
    context: 'input',
    source: 'name',
  })
  name: string;

  @SMParam({
    context: 'input',
    source: 'list',
    type: [Number],
  })
  list: number[];
}

@Payload()
export class QueueBody {
  @Field()
  code: number;

  @Field()
  isQueue: boolean;
}

@Payload()
export class ApiQueuePayload {
  @Param({
    source: 'body',
  })
  name: string;

  @Param({
    source: 'body',
    type: QueueBody,
  })
  body: QueueBody;
}

@QueuePayload()
export class QueueBody2 {
  @QueueField()
  code: number;

  @QueueField()
  isQueue: boolean;
}

@QueuePayload()
export class QueuePayloadEvent {
  @QueueParam({
    source: 'attribute',
  })
  name: string;

  @QueueParam({
    source: 'body',
    parse: true,
    type: QueueBody2,
  })
  body: QueueBody2;
}
