import { Publish, type PublishEventProps } from './publish';

export class PubSubService {
  static async publish(props: PublishEventProps) {
    const publish = new Publish(props);

    return publish.exec();
  }
}
