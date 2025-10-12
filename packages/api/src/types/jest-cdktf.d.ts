import 'jest';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveResource(resource: any): R;
      toHaveResourceWithProperties(resource: any, properties: any): R;
      toHaveDataSource(dataSource: any): R;
      toHaveDataSourceWithProperties(dataSource: any, properties: any): R;
      toHaveProvider(provider: any): R;
      toHaveProviderWithProperties(provider: any, properties: any): R;
    }
  }
}
