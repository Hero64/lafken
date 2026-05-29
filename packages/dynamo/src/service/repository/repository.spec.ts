import 'reflect-metadata';
import {
  BatchGetItemCommand,
  BatchWriteItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  Field,
  PartitionKey,
  type PrimaryPartition,
  SortKey,
  Table,
} from '../../main/table';
import { client } from '../client/client';
import { transaction } from '../transaction/transaction';
import { createRepository } from './repository';

interface Address {
  city: string;
  direction: string;
  number: number;
}

const dynamoClient = mockClient(client);
@Table({
  name: 'users',
  tracing: false,
  indexes: [
    {
      name: 'email_age_index',
      partitionKey: 'email',
      sortKey: 'age',
    },
  ],
})
class User {
  @PartitionKey(String)
  readonly email!: PrimaryPartition<string>;
  @SortKey(String)
  readonly name!: PrimaryPartition<string>;
  @Field()
  readonly lastName!: string;
  @Field()
  readonly age!: number;
  @Field()
  readonly address?: Address;
}

const userRepository = createRepository(User);
const EMAIL = 'example1@example.com';

describe('Dynamo Service', () => {
  afterAll(() => {
    client.destroy();
  });

  describe('READ', () => {
    beforeAll(() => {
      dynamoClient.on(QueryCommand).resolves({}).on(ScanCommand).resolves({});
    });

    afterAll(() => {
      dynamoClient.reset();
    });

    it('should exec query command with limit one', async () => {
      dynamoClient.on(QueryCommand).resolves({});

      await userRepository.findOne({
        keyCondition: {
          partition: {
            email: EMAIL,
          },
        },
      });

      expect(dynamoClient.commandCalls(QueryCommand)).toHaveLength(1);
      expect(
        dynamoClient.commandCalls(QueryCommand, {
          TableName: 'users',
          KeyConditionExpression: '#email = :email',
          Limit: 1,
          ScanIndexForward: true,
          ExpressionAttributeNames: { '#email': 'email' },
          ExpressionAttributeValues: { ':email': { S: 'example1@example.com' } },
        })
      ).toHaveLength(1);
    });

    it('Should find one user by partition and sort key', async () => {
      const name = 'example1';
      await userRepository.findOne({
        keyCondition: {
          partition: {
            email: EMAIL,
          },
          sort: {
            name,
          },
        },
      });

      expect(
        dynamoClient.commandCalls(QueryCommand, {
          TableName: 'users',
          KeyConditionExpression: '#email = :email and #name = :name',
          Limit: 1,
          ScanIndexForward: true,
          ExpressionAttributeNames: { '#email': 'email', '#name': 'name' },
          ExpressionAttributeValues: {
            ':email': { S: 'example1@example.com' },
            ':name': { S: name },
          },
        })
      ).toHaveLength(1);
    });

    it('Should get all users with same partition key', async () => {
      await userRepository.findAll({
        keyCondition: {
          partition: {
            email: EMAIL,
          },
        },
      });

      expect(
        dynamoClient.commandCalls(QueryCommand, {
          TableName: 'users',
          Limit: undefined,
          KeyConditionExpression: '#email = :email',
          ExpressionAttributeNames: { '#email': 'email' },
          ExpressionAttributeValues: { ':email': { S: 'example1@example.com' } },
        })
      ).toHaveLength(1);
    });

    it('Should throws by bad partition key', async () => {
      const call = async () => {
        await userRepository.findAll({
          keyCondition: {
            partition: {
              name: 'its not partition key',
            },
          },
        });
      };

      await expect(call()).rejects.toThrow('no index found for the selected attributes');
    });

    it('Should scan all users', async () => {
      await userRepository.scan();

      expect(dynamoClient.commandCalls(ScanCommand)).toHaveLength(1);
      expect(
        dynamoClient.commandCalls(ScanCommand, {
          TableName: 'users',
        })
      ).toHaveLength(1);
    });

    it('Should filter users', async () => {
      await userRepository.scan({
        filter: {
          age: {
            lessThan: 25,
          },
        },
      });

      expect(
        dynamoClient.commandCalls(ScanCommand, {
          TableName: 'users',
          FilterExpression: '#age < :age_1_0',
          ExpressionAttributeNames: { '#age': 'age' },
          ExpressionAttributeValues: { ':age_1_0': { N: '25' } },
        })
      ).toHaveLength(1);
    });

    it('Should scan with AND filter on same attribute', async () => {
      await userRepository.scan({
        filter: {
          AND: [{ age: { exist: true } }, { age: { greaterThan: 18 } }],
        },
      });

      expect(
        dynamoClient.commandCalls(ScanCommand, {
          TableName: 'users',
          FilterExpression: 'attribute_exists(#age) and #age > :age_3_0',
          ExpressionAttributeNames: {
            '#age': 'age',
          },
          ExpressionAttributeValues: {
            ':age_3_0': { N: '18' },
          },
        })
      ).toHaveLength(1);
    });

    it('Should scan with complex query', async () => {
      await userRepository.scan({
        filter: {
          age: {
            lessThan: 50,
          },
          OR: [
            {
              lastName: 'example1',
              name: {
                beginsWith: 'exa',
              },
            },
            {
              lastName: 'example2',
            },
          ],
          lastName: {
            notContains: 'notemail.com',
          },
          address: {
            city: {
              notExist: true,
            },
          },
        },
      });

      expect(
        dynamoClient.commandCalls(ScanCommand, {
          TableName: 'users',
          FilterExpression:
            '#age < :age_1_0 and (#lastName = :lastName_2_0 and begins_with(#name, :name_2_1) or #lastName = :lastName_3_0) and not contains(#lastName, :lastName_3_2) and attribute_not_exists(#address.#city)',
          ExpressionAttributeNames: {
            '#age': 'age',
            '#lastName': 'lastName',
            '#name': 'name',
            '#address': 'address',
            '#city': 'city',
          },
          ExpressionAttributeValues: {
            ':age_1_0': { N: '50' },
            ':lastName_2_0': { S: 'example1' },
            ':name_2_1': { S: 'exa' },
            ':lastName_3_0': { S: 'example2' },
            ':lastName_3_2': { S: 'notemail.com' },
          },
        })
      ).toHaveLength(1);
    });
  });

  describe('CREATE', () => {
    beforeAll(() => {
      dynamoClient.on(PutItemCommand).resolves({});
    });

    afterAll(() => {
      dynamoClient.reset();
    });

    it('Should create a new user', async () => {
      await userRepository.create({
        email: 'example3@example.com',
        age: 40,
        name: 'example3',
        lastName: 'example3',
      });

      expect(
        dynamoClient.commandCalls(PutItemCommand, {
          TableName: 'users',
          Item: {
            email: { S: 'example3@example.com' },
            age: { N: '40' },
            name: { S: 'example3' },
            lastName: { S: 'example3' },
          },
          ConditionExpression:
            'attribute_not_exists(#email) and attribute_not_exists(#name)',
          ExpressionAttributeNames: { '#email': 'email', '#name': 'name' },
          ExpressionAttributeValues: undefined,
        })
      ).toHaveLength(1);
    });
  });

  describe('UPDATE', () => {
    beforeAll(() => {
      dynamoClient.on(UpdateItemCommand).resolves({});
    });
    afterAll(() => {
      dynamoClient.reset();
    });
    it('Should replace values user', async () => {
      const name = 'example1';
      await userRepository.update({
        keyCondition: {
          email: EMAIL,
          name,
        },
        replaceValues: {
          age: 55,
          lastName: {
            ifNotExistValue: 'changed_if_not_exist',
          },
        },
      });

      expect(
        dynamoClient.commandCalls(UpdateItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
          UpdateExpression:
            'SET  #age = :age_1_0,#lastName = if_not_exists(#lastName, :lastName_1_0)',
          ExpressionAttributeNames: { '#age': 'age', '#lastName': 'lastName' },
          ExpressionAttributeValues: {
            ':age_1_0': { N: '55' },
            ':lastName_1_0': { S: 'changed_if_not_exist' },
          },
        })
      ).toHaveLength(1);
    });

    it('Should update only not existent value', async () => {
      const name = 'example1';
      await userRepository.update({
        keyCondition: {
          email: EMAIL,
          name,
        },
        replaceValues: {
          age: {
            ifNotExistValue: 100,
          },
          address: {
            ifNotExistValue: {
              city: 'York New',
              direction: 'example',
              number: 1,
            },
          },
        },
      });

      expect(
        dynamoClient.commandCalls(UpdateItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
          UpdateExpression:
            'SET  #age = if_not_exists(#age, :age_1_0),#address = if_not_exists(#address, :address_1_0)',
          ExpressionAttributeNames: { '#age': 'age', '#address': 'address' },
          ExpressionAttributeValues: {
            ':age_1_0': { N: '100' },
            ':address_1_0': {
              M: {
                city: {
                  S: 'York New',
                },
                direction: {
                  S: 'example',
                },
                number: { N: '1' },
              },
            },
          },
        })
      ).toHaveLength(1);
    });

    it('Should update only deep property', async () => {
      await userRepository.update({
        keyCondition: {
          email: 'example2@example.com',
          name: 'example2',
        },
        setValues: {
          address: {
            direction: 'new direction',
          },
        },
      });

      expect(
        dynamoClient.commandCalls(UpdateItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example2@example.com' }, name: { S: 'example2' } },
          UpdateExpression: 'SET #address.#direction = :address_direction_2_0',
          ExpressionAttributeNames: { '#address': 'address', '#direction': 'direction' },
          ExpressionAttributeValues: { ':address_direction_2_0': { S: 'new direction' } },
        })
      ).toHaveLength(1);
    });

    it('Should remove address property', async () => {
      await userRepository.update({
        keyCondition: {
          email: 'example2@example.com',
          name: 'example2',
        },
        removeValues: {
          address: true,
        },
      });

      expect(
        dynamoClient.commandCalls(UpdateItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example2@example.com' }, name: { S: 'example2' } },
          UpdateExpression: 'REMOVE #address',
          ExpressionAttributeNames: { '#address': 'address' },
          ExpressionAttributeValues: undefined,
        })
      ).toHaveLength(1);
    });

    it('Should add condition expression', async () => {
      const name = 'example1';
      await userRepository.update({
        keyCondition: {
          email: EMAIL,
          name,
        },
        replaceValues: {
          age: 55,
        },
        condition: {
          name: {
            exist: true,
          },
          age: {
            exist: true,
          },
        },
      });

      expect(
        dynamoClient.commandCalls(UpdateItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
          UpdateExpression: 'SET  #age = :age_1_0',
          ExpressionAttributeNames: { '#age': 'age', '#name': 'name' },
          ExpressionAttributeValues: { ':age_1_0': { N: '55' } },
          ConditionExpression: 'attribute_exists(#name) and attribute_exists(#age)',
        })
      ).toHaveLength(1);
    });

    it('Should include ReturnValues when returnValue is provided', async () => {
      const name = 'example1';
      await userRepository.update({
        keyCondition: {
          email: EMAIL,
          name,
        },
        replaceValues: {
          age: 30,
        },
        returnValue: 'all_new',
      });

      expect(
        dynamoClient.commandCalls(UpdateItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
          UpdateExpression: 'SET  #age = :age_1_0',
          ExpressionAttributeNames: { '#age': 'age' },
          ExpressionAttributeValues: { ':age_1_0': { N: '30' } },
          ReturnValues: 'ALL_NEW',
        })
      ).toHaveLength(1);
    });

    it('Should return the updated item when returnValue is all_new', async () => {
      dynamoClient.on(UpdateItemCommand).resolves({
        Attributes: {
          email: { S: 'example1@example.com' },
          name: { S: 'example1' },
          age: { N: '30' },
          lastName: { S: 'Doe' },
        },
      });

      const result = await userRepository.update({
        keyCondition: {
          email: EMAIL,
          name: 'example1',
        },
        replaceValues: {
          age: 30,
        },
        returnValue: 'all_new',
      });

      expect(result).toEqual({
        email: 'example1@example.com',
        name: 'example1',
        age: 30,
        lastName: 'Doe',
      });
    });

    it('Should return undefined when returnValue is none', async () => {
      dynamoClient.on(UpdateItemCommand).resolves({
        Attributes: {
          email: { S: 'example1@example.com' },
          name: { S: 'example1' },
          age: { N: '30' },
        },
      });

      const result = await userRepository.update({
        keyCondition: {
          email: EMAIL,
          name: 'example1',
        },
        replaceValues: {
          age: 30,
        },
        returnValue: 'none',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('GET ITEM', () => {
    beforeAll(() => {
      dynamoClient.on(GetItemCommand).resolves({});
    });

    afterAll(() => {
      dynamoClient.reset();
    });

    it('Should send GetItemCommand with correct key', async () => {
      await userRepository.getItem({
        email: EMAIL,
        name: 'example1',
      });

      expect(
        dynamoClient.commandCalls(GetItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
        })
      ).toHaveLength(1);
    });

    it('Should return undefined when item does not exist', async () => {
      dynamoClient.on(GetItemCommand).resolves({ Item: undefined });

      const result = await userRepository.getItem({
        email: EMAIL,
        name: 'example1',
      });

      expect(result).toBeUndefined();
    });

    it('Should send GetItemCommand with consistentRead', async () => {
      dynamoClient.on(GetItemCommand).resolves({});

      await userRepository.getItem(
        { email: EMAIL, name: 'example1' },
        { consistentRead: true }
      );

      expect(
        dynamoClient.commandCalls(GetItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
          ConsistentRead: true,
        })
      ).toHaveLength(1);
    });

    it('Should send GetItemCommand with projection', async () => {
      dynamoClient.on(GetItemCommand).resolves({});

      await userRepository.getItem(
        { email: EMAIL, name: 'example1' },
        { projection: ['email', 'age'] }
      );

      expect(
        dynamoClient.commandCalls(GetItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
          ProjectionExpression: 'email, age',
        })
      ).toHaveLength(1);
    });

    it('Should return the item when it exists', async () => {
      dynamoClient.on(GetItemCommand).resolves({
        Item: {
          email: { S: 'example1@example.com' },
          name: { S: 'example1' },
          lastName: { S: 'Doe' },
          age: { N: '30' },
        },
      });

      const result = await userRepository.getItem({
        email: EMAIL,
        name: 'example1',
      });

      expect(result).toEqual({
        email: 'example1@example.com',
        name: 'example1',
        lastName: 'Doe',
        age: 30,
      });
    });
  });

  describe('BATCH GET', () => {
    beforeAll(() => {
      dynamoClient.on(BatchGetItemCommand).resolves({});
    });

    afterAll(() => {
      dynamoClient.reset();
    });

    it('Should send BatchGetItemCommand with correct keys', async () => {
      await userRepository.batchGet([
        { email: 'example1@example.com', name: 'example1' },
        { email: 'example2@example.com', name: 'example2' },
      ]);

      expect(
        dynamoClient.commandCalls(BatchGetItemCommand, {
          RequestItems: {
            users: {
              Keys: [
                { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
                { email: { S: 'example2@example.com' }, name: { S: 'example2' } },
              ],
            },
          },
        })
      ).toHaveLength(1);
    });

    it('Should send BatchGetItemCommand with consistentRead', async () => {
      await userRepository.batchGet([{ email: EMAIL, name: 'example1' }], {
        consistentRead: true,
      });

      expect(
        dynamoClient.commandCalls(BatchGetItemCommand, {
          RequestItems: {
            users: {
              Keys: [{ email: { S: 'example1@example.com' }, name: { S: 'example1' } }],
              ConsistentRead: true,
            },
          },
        })
      ).toHaveLength(1);
    });

    it('Should send BatchGetItemCommand with projection', async () => {
      await userRepository.batchGet([{ email: EMAIL, name: 'example1' }], {
        projection: ['email', 'age'],
      });

      expect(
        dynamoClient.commandCalls(BatchGetItemCommand, {
          RequestItems: {
            users: {
              Keys: [{ email: { S: 'example1@example.com' }, name: { S: 'example1' } }],
              ProjectionExpression: 'email, age',
            },
          },
        })
      ).toHaveLength(1);
    });

    it('Should return parsed items', async () => {
      dynamoClient.on(BatchGetItemCommand).resolves({
        Responses: {
          users: [
            {
              email: { S: 'example1@example.com' },
              name: { S: 'example1' },
              age: { N: '30' },
            },
            {
              email: { S: 'example2@example.com' },
              name: { S: 'example2' },
              age: { N: '25' },
            },
          ],
        },
      });

      const result = await userRepository.batchGet([
        { email: 'example1@example.com', name: 'example1' },
        { email: 'example2@example.com', name: 'example2' },
      ]);

      expect(result).toEqual([
        { email: 'example1@example.com', name: 'example1', age: 30 },
        { email: 'example2@example.com', name: 'example2', age: 25 },
      ]);
    });

    it('Should return empty array when no items found', async () => {
      dynamoClient.on(BatchGetItemCommand).resolves({ Responses: {} });

      const result = await userRepository.batchGet([{ email: EMAIL, name: 'example1' }]);

      expect(result).toEqual([]);
    });
  });

  describe('CACHE', () => {
    const ITEM = {
      email: { S: EMAIL },
      name: { S: 'example1' },
      age: { N: '30' },
      lastName: { S: 'Doe' },
    };

    beforeEach(() => {
      vi.useFakeTimers();
      dynamoClient
        .on(QueryCommand)
        .resolves({ Items: [ITEM] })
        .on(GetItemCommand)
        .resolves({ Item: ITEM });
    });

    afterEach(() => {
      vi.useRealTimers();
      dynamoClient.reset();
      userRepository.clearCache();
    });

    describe('findOne', () => {
      it('Should query DynamoDB only once for the same key within TTL', async () => {
        const inputProps = { keyCondition: { partition: { email: EMAIL } } };

        await userRepository.findOne(inputProps, 60);
        await userRepository.findOne(inputProps, 60);

        expect(dynamoClient.commandCalls(QueryCommand)).toHaveLength(1);
      });

      it('Should query DynamoDB again after TTL expires', async () => {
        const inputProps = { keyCondition: { partition: { email: EMAIL } } };

        await userRepository.findOne(inputProps, 60);
        vi.advanceTimersByTime(61_000);
        await userRepository.findOne(inputProps, 60);

        expect(dynamoClient.commandCalls(QueryCommand)).toHaveLength(2);
      });

      it('Should query DynamoDB for different key conditions independently', async () => {
        await userRepository.findOne(
          { keyCondition: { partition: { email: EMAIL } } },
          60
        );
        await userRepository.findOne(
          { keyCondition: { partition: { email: 'other@example.com' } } },
          60
        );

        expect(dynamoClient.commandCalls(QueryCommand)).toHaveLength(2);
      });
    });

    describe('findAll', () => {
      it('Should query DynamoDB only once for the same key within TTL', async () => {
        const inputProps = { keyCondition: { partition: { email: EMAIL } } };

        await userRepository.findAll(inputProps, 60);
        await userRepository.findAll(inputProps, 60);

        expect(dynamoClient.commandCalls(QueryCommand)).toHaveLength(1);
      });

      it('Should query DynamoDB again after TTL expires', async () => {
        const inputProps = { keyCondition: { partition: { email: EMAIL } } };

        await userRepository.findAll(inputProps, 60);
        vi.advanceTimersByTime(61_000);
        await userRepository.findAll(inputProps, 60);

        expect(dynamoClient.commandCalls(QueryCommand)).toHaveLength(2);
      });
    });

    describe('getItem', () => {
      it('Should call DynamoDB only once for the same key within TTL', async () => {
        const key = { email: EMAIL, name: 'example1' };

        await userRepository.getItem(key, { cacheTtl: 60 });
        await userRepository.getItem(key, { cacheTtl: 60 });

        expect(dynamoClient.commandCalls(GetItemCommand)).toHaveLength(1);
      });

      it('Should call DynamoDB again after TTL expires', async () => {
        const key = { email: EMAIL, name: 'example1' };

        await userRepository.getItem(key, { cacheTtl: 60 });
        vi.advanceTimersByTime(61_000);
        await userRepository.getItem(key, { cacheTtl: 60 });

        expect(dynamoClient.commandCalls(GetItemCommand)).toHaveLength(2);
      });
    });
  });

  describe('REMOVE', () => {
    beforeAll(() => {
      dynamoClient.on(DeleteItemCommand).resolves({});
    });
    afterAll(() => {
      dynamoClient.reset();
    });
    it('Should remove user', async () => {
      await userRepository.delete({
        email: EMAIL,
        name: 'example1',
      });
      expect(
        dynamoClient.commandCalls(DeleteItemCommand, {
          TableName: 'users',
          Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
        })
      ).toHaveLength(1);
    });
  });

  describe('BULK CREATE', () => {
    beforeAll(() => {
      dynamoClient.on(BatchWriteItemCommand).resolves({});
    });

    afterAll(() => {
      dynamoClient.reset();
    });

    it('Should create users by array', async () => {
      await userRepository.bulkCreate([
        {
          email: 'example4@example.com',
          age: 40,
          name: 'example4',
          lastName: 'example4',
        },
        {
          email: 'example5@example.com',
          age: 40,
          name: 'example5',
          lastName: 'example5',
        },
      ]);

      expect(
        dynamoClient.commandCalls(BatchWriteItemCommand, {
          RequestItems: {
            users: [
              {
                PutRequest: {
                  Item: {
                    email: {
                      S: 'example4@example.com',
                    },
                    age: {
                      N: '40',
                    },
                    name: {
                      S: 'example4',
                    },
                    lastName: {
                      S: 'example4',
                    },
                  },
                },
              },
              {
                PutRequest: {
                  Item: {
                    email: {
                      S: 'example5@example.com',
                    },
                    age: {
                      N: '40',
                    },
                    name: {
                      S: 'example5',
                    },
                    lastName: {
                      S: 'example5',
                    },
                  },
                },
              },
            ],
          },
        })
      ).toHaveLength(1);
    });
  });

  describe('BULK DELETE', () => {
    beforeAll(() => {
      dynamoClient.on(BatchWriteItemCommand).resolves({});
    });

    afterAll(() => {
      dynamoClient.reset();
    });
    it('Should delete users by array', async () => {
      await userRepository.bulkDelete([
        {
          email: 'example1@example.com',
          name: 'example1',
        },
        {
          email: 'example2@example.com',
          name: 'example2',
        },
      ]);

      expect(
        dynamoClient.commandCalls(BatchWriteItemCommand, {
          RequestItems: {
            users: [
              {
                DeleteRequest: {
                  Key: { email: { S: 'example1@example.com' }, name: { S: 'example1' } },
                },
              },
              {
                DeleteRequest: {
                  Key: { email: { S: 'example2@example.com' }, name: { S: 'example2' } },
                },
              },
            ],
          },
        })
      ).toHaveLength(1);
    });
  });

  describe('TRANSACTION', () => {
    beforeAll(() => {
      dynamoClient.on(TransactWriteItemsCommand).resolves({});
    });

    afterAll(() => {
      dynamoClient.reset();
    });

    it('Should create and edit in same query', async () => {
      await transaction([
        userRepository.create({
          email: 'transaction@example.cl',
          name: 'Transaction',
          lastName: 'User',
          age: 10,
        }),
        userRepository.update({
          keyCondition: {
            email: 'example1@example.com',
            name: 'example1',
          },
          replaceValues: {
            age: 100,
          },
        }),
      ]);

      expect(dynamoClient.commandCalls(TransactWriteItemsCommand, {})).toHaveLength(1);
    });
  });
});
