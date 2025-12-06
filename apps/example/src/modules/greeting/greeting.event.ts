import { Event, EventRule, Rule } from '@alicanto/event/main';

@EventRule({
  minify: false,
})
export class GreetingEvent {
  @Rule({
    pattern: {
      source: 'simple-source',
    },
  })
  sayHelloFromEvent(@Event() e: any) {
    console.log('simple source', e);
  }

  @Rule({
    integration: 's3',
    pattern: {
      detailType: ['Object Created'],
      detail: {
        bucket: {
          name: ['alicanto-example-documents'],
        },
        object: {
          key: [
            {
              prefix: 'test.json',
            },
          ],
        },
      },
    },
  })
  s3Event(@Event() e: any) {
    console.log('from s3', e);
  }

  @Rule({
    integration: 'dynamodb',
    pattern: {
      source: 'clients',
      detail: {
        eventName: ['INSERT', 'MODIFY'],
        keys: {
          email: {
            prefix: 'ccc@aa',
          },
        },
      },
    },
  })
  dynamoEvent(@Event() e: any) {
    console.log('from dynamo', JSON.stringify(e, null, 2));
  }
}
