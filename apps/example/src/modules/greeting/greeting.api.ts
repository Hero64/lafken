import { Api, Delete, Event, Get, Post, response } from '@alicanto/api/main';
import dayjs from 'dayjs';

import {
  type Bye307,
  type Bye404,
  ByeEvent,
  ByeResponse,
  HelloEvent,
  HelloResponse,
  NewGreetingEvent,
} from './greeting.field';

@Api({
  path: 'greeting/{id}',
  minify: false,
})
export class GreetingApi {
  @Get({
    path: '/hello',
    response: [HelloResponse],
    lambda: {
      memory: 100,
      tags: {
        aa: 'bbb',
      },
    },
  })
  sayHello(@Event(HelloEvent) e: HelloEvent): HelloResponse[] {
    console.log(`Hello my name is ${e.name}. My greeting id is ${e.id}`);

    return [
      {
        name: e.name,
        date: dayjs().toISOString(),
      },
    ];
  }

  @Delete({
    path: '/bye/{type}',
    response: ByeResponse,
  })
  sayBye(@Event(ByeEvent) e: ByeEvent): ByeResponse {
    const fullName = `${e.name} ${e.lastName}`;
    console.log(`Good bye ${e.name} ${e.lastName}`);

    if (e.type === 404) {
      response<Bye404>(404, {
        foo: `foo ${e.name}`,
      });
    } else if (e.type === 307) {
      response<Bye307>(307, {
        bar: `foo ${e.name}`,
      });
    }

    return {
      fullName,
      id: e.id,
    };
  }

  @Post()
  createNewGreeting(@Event(NewGreetingEvent) e: NewGreetingEvent) {
    console.log(`wsp from post ${e.name} ${e.lastName}`);

    return e;
  }
}
