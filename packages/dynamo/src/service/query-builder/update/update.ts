import {
  type ReturnValue,
  UpdateItemCommand,
  type UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { ClassResource } from '@lafken/common';

import { QueryBuilderBase } from '../base/base';
import type {
  DeepReplaceValue,
  Item,
  ObjectToBoolean,
  ReturnValueOption,
  UpdateReturnType,
} from '../query-builder.types';
import type { UpdateBuilderProps } from './update.types';
import { updateResolver, updateResolverKeys } from './update.utils';

export class UpdateBuilder<
  E extends ClassResource,
  R extends ReturnValueOption | undefined = undefined,
> extends QueryBuilderBase<E> {
  protected command: UpdateItemCommandInput;

  constructor(protected queryOptions: UpdateBuilderProps<E>) {
    super(queryOptions);
    this.prepare();
  }

  public getCommand() {
    return this.command;
  }

  public then<T>(
    resolve: (value: UpdateReturnType<E, R>) => T,
    reject: (reason: any) => T
  ): Promise<T> {
    return (this.exec() as Promise<UpdateReturnType<E, R>>).then(resolve, reject);
  }

  private async exec() {
    const command = new UpdateItemCommand(this.command);

    const response = await this.queryOptions.client.send(command);
    if (
      !response?.Attributes ||
      ['none', undefined].includes(this.queryOptions.inputProps.returnValue)
    ) {
      return undefined;
    }

    return unmarshall(response?.Attributes) as Item<E>;
  }

  protected prepare() {
    const {
      removeValues = {},
      replaceValues = {},
      setValues = {},
      condition,
    } = this.queryOptions.inputProps;

    if (
      Object.keys(removeValues).length > 0 &&
      Object.keys(replaceValues).length > 0 &&
      Object.keys(setValues).length > 0
    ) {
      throw new Error('You must assign a value to update');
    }

    let setExpression = '';
    if (Object.keys(setValues).length > 0) {
      setExpression = this.setValues(setValues, true, [], this.expressionGroupCounter++);
    }
    if (Object.keys(replaceValues).length > 0) {
      setExpression += ` ${this.setValues(replaceValues, false, [], this.expressionGroupCounter++)}`;
    }

    const removeExpression = this.removeValues(removeValues);

    const keyCondition = this.queryOptions.inputProps.keyCondition as unknown as Partial<
      Item<E>
    >;

    this.command = {
      TableName: this.queryOptions.modelProps.name,
      Key: marshall(keyCondition, { removeUndefinedValues: true }),
      ConditionExpression: condition
        ? this.getFilterExpression(condition, [], 'and', this.expressionGroupCounter++)
        : undefined,
      UpdateExpression:
        `${setExpression ? `SET ${setExpression}` : ''} ${removeExpression ? `REMOVE ${removeExpression}` : ''}`.trim(),
      ...this.getAttributesAndNames(),
      ReturnValues: this.queryOptions.inputProps.returnValue
        ? (this.queryOptions.inputProps.returnValue.toUpperCase() as ReturnValue)
        : undefined,
    };
  }

  private setValues(
    values: DeepReplaceValue<Item<E>>,
    isDeepReplace: boolean,
    names: string[] = [],
    counter = 0
  ) {
    counter += 1;
    const filterExpression: string[] = [];
    const index = 0;
    for (const key in values) {
      const currentKeyNames = [...names, key];
      const keyName = currentKeyNames.join('.#');
      const keyValue = `${currentKeyNames.join('_')}_${counter}_${index}`;

      this.attributeNames[`#${key}`] = key;
      const name = `#${keyName}`;

      if (typeof values[key] === 'object' && !Array.isArray(values[key])) {
        const keys = Object.keys(values[key] || {});
        const updateResolverKey = keys.find((key) => updateResolverKeys.has(key));

        if (updateResolverKey) {
          const resolverFn =
            updateResolver[updateResolverKey as keyof typeof updateResolver];
          const { attributeValues, expression } = resolverFn(
            name,
            keyValue,
            (values[key] as Record<string, unknown>)[updateResolverKey]
          );

          this.attributeValues = {
            ...this.attributeValues,
            ...attributeValues,
          };

          filterExpression.push(expression);
          continue;
        }

        if (isDeepReplace) {
          filterExpression.push(
            this.setValues(
              values[key] as DeepReplaceValue<Item<E>>,
              true,
              currentKeyNames,
              counter
            )
          );
          continue;
        }
        filterExpression.push(`#${keyName} = :${keyValue}`);
        this.attributeValues[`:${keyValue}`] = values[key];

        continue;
      }

      filterExpression.push(`#${keyName} = :${keyValue}`);
      this.attributeValues[`:${keyValue}`] = values[key];
    }
    return filterExpression.join(',').trim();
  }

  private removeValues(values: ObjectToBoolean<Item<E>>) {
    const removedKeys: string[] = [];
    for (const key in values) {
      const keyValue = `#${key}`;
      if (typeof values[key] === 'boolean') {
        this.attributeNames[`#${key}`] = key;
        removedKeys.push(keyValue);
        continue;
      }

      if (values[key] !== undefined) {
        const removed = this.removeValues(values[key] as ObjectToBoolean<Item<E>>);
        removedKeys.push(removed);
      }
    }

    return removedKeys.join(',');
  }
}
