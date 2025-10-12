import { alicantoResource } from '../resources';

export class ResolveResources<T = string> {
  private unresolved: string[] = [];

  public getResourceValue(value: T) {
    this.unresolved = [];
    const resourceValues = String(value).split('::');

    if (resourceValues.length !== 3) {
      throw new Error(`value ${value} is not valid resource`);
    }

    const [scope, id, property] = resourceValues;

    const resource = alicantoResource.getResource(`${scope}-${id}`);

    if (!resource) {
      this.unresolved.push(`${scope}_${id}`);
      return '';
    }

    const propertyValue = resource[property];
    if (!propertyValue) {
      throw new Error(`property ${property} in ${scope}::${id} not found`);
    }

    return propertyValue;
  }

  public hasUnresolved() {
    return this.unresolved.length > 0;
  }
}
