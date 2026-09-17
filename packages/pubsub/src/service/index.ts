import { Publish } from './publish/publish';
import type { PublishEventProps } from './publish/publish.types';

export class PubSubService {
  static async publish(props: PublishEventProps) {
    const publish = new Publish(props);

    return publish.exec();
  }
}
