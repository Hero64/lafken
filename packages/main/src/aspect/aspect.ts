import type { IAspect } from 'cdktn';
import type { Construct, IConstruct } from 'constructs';

interface TaggableResource extends Construct {
  tags?: Record<string, string>;
  tagsInput?: Record<string, string>;
}

interface AppAspectProps {
  tags: Record<string, string>;
}

export class AppAspect implements IAspect {
  constructor(private props: AppAspectProps) {}

  visit(node: IConstruct) {
    if (this.isTaggableResource(node)) {
      const currentTags = node.tagsInput || {};
      node.tags = { ...this.props.tags, ...currentTags };
    }
  }

  private isTaggableResource(resource: Construct): resource is TaggableResource {
    return 'tags' in resource && 'tagsInput' in resource;
  }
}
