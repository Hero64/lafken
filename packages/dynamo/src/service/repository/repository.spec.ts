import 'reflect-metadata';
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
    it('Should find one user', async () => {
      const user = await userRepository
        .findOne({
          keyCondition: {
            partition: {
              email: EMAIL,
            },
          },
        })
        .exec();

      expect(user).toBeDefined();
      expect(user.email).toBe(EMAIL);
    });

    it('Should find one user by partition and sort key', async () => {
      const name = 'example1';
      const user = await userRepository
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

      expect(user).toBeDefined();
      expect(user.email).toBe(EMAIL);
      expect(user.name).toBe(name);
    });

    it('Should return undefined by nonexistent user', async () => {
      const user = await userRepository
        .findOne({
          keyCondition: {
            partition: {
              email: 'nonexistent@example.com',
            },
          },
        })
        .exec();

      expect(user).toBeUndefined();
    });

    it('Should get all users with same partition key', async () => {
      const { data } = await userRepository
        .findAll({
          keyCondition: {
            partition: {
              email: EMAIL,
            },
          },
        })
        .exec();

      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data[0]).toBeDefined;
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

      await expect(call()).rejects.toThrow();
    });

    it('Should scan all users', async () => {
      const { data } = await userRepository.scan().exec();

      expect(data).toBeDefined();
      expect(data.length).toBe(2);
    });

    it('Should filter users', async () => {
      const { data } = await userRepository
        .scan({
          filter: {
            age: {
              lessThan: 25,
            },
          },
        })
        .exec();

      expect(data).toBeDefined();
      expect(data.length).toBe(1);
    });

    it('Should scan with complex query', async () => {
      const { data } = await userRepository
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

      expect(data).toBeDefined();
      expect(data.length).toBe(1);
    });
  });

  describe('CREATE', () => {
    it('Should create a new user', async () => {
      const user = await userRepository
        .create({
          email: 'example3@example.com',
          age: 40,
          name: 'example3',
          lastName: 'example3',
        })
        .exec();

      expect(user).toBeDefined();

      const { data } = await userRepository.scan().exec();

      expect(data.length).toBe(3);
    });
  });

  describe('UPDATE', () => {
    it('Should replace values user', async () => {
      const name = 'example1';
      const updated = await userRepository
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

      expect(updated).toBeTruthy();

      const user = await userRepository
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

      expect(user.age).toBe(55);
    });

    it('Should update only not existent value', async () => {
      const name = 'example1';
      const updated = await userRepository
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

      expect(updated).toBeTruthy();

      const user = await userRepository
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

      expect(user.age).toBe(30);
      expect(user.address?.city).toBe('York New');
    });

    it('Should update only deep property', async () => {
      const updated = await userRepository
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

      expect(updated).toBeTruthy();

      const user = await userRepository
        .findOne({
          keyCondition: {
            partition: {
              email: 'example2@example.com',
            },
            sort: {
              name: 'example2',
            },
          },
        })
        .exec();

      expect(user.address?.direction).toBe('new direction');
    });

    it('Should remove address property', async () => {
      const updated = await userRepository
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

      expect(updated).toBeTruthy();

      const user = await userRepository
        .findOne({
          keyCondition: {
            partition: {
              email: 'example2@example.com',
            },
            sort: {
              name: 'example2',
            },
          },
        })
        .exec();

      expect(user.address).toBeUndefined();
    });
  });

  describe('REMOVE', () => {
    it('Should remove user', async () => {
      await userRepository
        .delete({
          email: EMAIL,
          name: 'example1',
        })
        .exec();

      const user = await userRepository
        .findOne({
          keyCondition: {
            partition: {
              email: EMAIL,
            },
          },
        })
        .exec();

      expect(user).toBeUndefined();
    });
  });

  describe('BULK CREATE', () => {
    it('Should create users by array', async () => {
      const { data: dataPreCreate } = await userRepository.scan().exec();

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

      const { data: dataPostCreate } = await userRepository.scan().exec();

      expect(dataPreCreate.length + 2).toBe(dataPostCreate.length);
    });
  });

  describe('BULK DELETE', () => {
    it('Should delete users by array', async () => {
      const { data: dataPreCreate } = await userRepository.scan().exec();

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

      const { data: dataPostCreate } = await userRepository.scan().exec();

      expect(dataPreCreate.length - 2).toBe(dataPostCreate.length);
    });
  });

  describe.skip('TRANSACTION', () => {
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
    });
  });
});
