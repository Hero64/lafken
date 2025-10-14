module.exports = {
  tables: [
    {
      TableName: 'users',
      KeySchema: [
        { AttributeName: 'email', KeyType: 'HASH' },
        { AttributeName: 'name', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'email', AttributeType: 'S' },
        { AttributeName: 'name', AttributeType: 'S' },
        { AttributeName: 'age', AttributeType: 'N' },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: 'email_age_index',
          KeySchema: [
            { AttributeName: 'email', KeyType: 'HASH' },
            { AttributeName: 'age', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        },
      ],
      data: [
        {
          email: 'example1@example.com',
          name: 'example1',
          lastName: 'example1',
          age: 30,
        },
        {
          email: 'example2@example.com',
          name: 'example2',
          lastName: 'example2',
          age: 20,
          address: {
            city: 'York New',
            direction: 'example',
            number: 1,
          },
        },
      ],
    },
  ],
  basePort: 9876,
};
