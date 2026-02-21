import 'reflect-metadata';
import {
  BatchWriteItemCommand,
  DeleteItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Field,
  Model,
  PartitionKey,
  type PrimaryPartition,
  SortKey,
} from '../../main/model';
import { client } from '../client/client';
import { transaction } from '../transaction/transaction';
import { createRepository } from './repository';

interface Address {
  city: string;
  direction: string;
  number: number;
}

const dynamoClient = mockClient(client);
@Model({
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

      await userRepository
        .findOne({
          keyCondition: {
            partition: {
              email: EMAIL,
            },
          },
        })
        .exec();

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
      await userRepository
        .findOne({
          keyCondition: {
            partition: {
              email: EMAIL,
            },
            sort: {
              name,
            },
          },
        })
        .exec();

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
      await userRepository
        .findAll({
          keyCondition: {
            partition: {
              email: EMAIL,
            },
          },
        })
        .exec();

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
        await userRepository
          .findAll({
            keyCondition: {
              partition: {
                name: 'its not partition key',
              },
            },
          })
          .exec();
      };

      await expect(call()).rejects.toThrow('no index found for the selected attributes');
    });

    it('Should scan all users', async () => {
      await userRepository.scan().exec();

      expect(dynamoClient.commandCalls(ScanCommand)).toHaveLength(1);
      expect(
        dynamoClient.commandCalls(ScanCommand, {
          TableName: 'users',
        })
      ).toHaveLength(1);
    });

    it('Should filter users', async () => {
      await userRepository
        .scan({
          filter: {
            age: {
              lessThan: 25,
            },
          },
        })
        .exec();

      expect(
        dynamoClient.commandCalls(ScanCommand, {
          TableName: 'users',
          FilterExpression: '(#age < :age_1_0)',
          ExpressionAttributeNames: { '#age': 'age' },
          ExpressionAttributeValues: { ':age_1_0': { N: '25' } },
        })
      ).toHaveLength(1);
    });

    it('Should scan with complex query', async () => {
      await userRepository
        .scan({
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
        })
        .exec();

      expect(
        dynamoClient.commandCalls(ScanCommand, {
          TableName: 'users',
          FilterExpression:
            '(#age < :age_1_0 and ((#lastName = :lastName_2_0 and begins_with(#name, :name_2_1)) or (#lastName = :lastName_3_0)) and not contains(#lastName, :lastName_3_2) and (attribute_not_exists(#address.#city)))',
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
      await userRepository
        .create({
          email: 'example3@example.com',
          age: 40,
          name: 'example3',
          lastName: 'example3',
        })
        .exec();

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
            '(attribute_not_exists(#email) and attribute_not_exists(#name))',
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
      await userRepository
        .update({
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
        })
        .exec();

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
      await userRepository
        .update({
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
        })
        .exec();

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
      await userRepository
        .update({
          keyCondition: {
            email: 'example2@example.com',
            name: 'example2',
          },
          setValues: {
            address: {
              direction: 'new direction',
            },
          },
        })
        .exec();

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
      await userRepository
        .update({
          keyCondition: {
            email: 'example2@example.com',
            name: 'example2',
          },
          removeValues: {
            address: true,
          },
        })
        .exec();

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
  });

  describe('REMOVE', () => {
    beforeAll(() => {
      dynamoClient.on(DeleteItemCommand).resolves({});
    });
    afterAll(() => {
      dynamoClient.reset();
    });
    it('Should remove user', async () => {
      await userRepository
        .delete({
          email: EMAIL,
          name: 'example1',
        })
        .exec();
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
      await userRepository
        .bulkCreate([
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
        ])
        .exec();

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
      await userRepository
        .bulkDelete([
          {
            email: 'example1@example.com',
            name: 'example1',
          },
          {
            email: 'example2@example.com',
            name: 'example2',
          },
        ])
        .exec();

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
