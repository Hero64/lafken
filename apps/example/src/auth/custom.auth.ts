import {
  type AuthorizationHandlerEvent,
  AuthorizerHandler,
  type AuthorizerResponse,
  CustomAuthorizer,
} from '@alicanto/api/main';

@CustomAuthorizer({
  name: 'ExampleCustomAuthorizer',
  header: 'Authorization',
})
export class ExampleCustomAuthorizer {
  @AuthorizerHandler()
  handler(_e: AuthorizationHandlerEvent): AuthorizerResponse {
    return {
      allow: true,
      principalId: 'example@example.com',
    };
  }
}
