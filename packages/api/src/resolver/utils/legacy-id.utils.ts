import { Aspects, type TerraformResource, TerraformStack } from 'cdktn';

export const moveFromLegacyId = (resource: TerraformResource, legacyId: string) => {
  if (legacyId === resource.node.id) {
    return;
  }

  let moved = false;
  Aspects.of(resource).add({
    visit: (node) => {
      if (
        moved ||
        node !== resource ||
        resource.node.scope?.node.tryFindChild(legacyId)
      ) {
        return;
      }
      moved = true;

      const stack = TerraformStack.of(resource) as unknown as {
        allocateLogicalId(node: { scopes: { node: { id: string } }[] }): string;
      };
      const legacyLogicalId = stack.allocateLogicalId({
        scopes: [...resource.node.scopes.slice(0, -1), { node: { id: legacyId } }],
      });

      resource.moveFromId(`${resource.terraformResourceType}.${legacyLogicalId}`);
    },
  });
};
