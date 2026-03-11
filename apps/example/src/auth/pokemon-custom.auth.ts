import {
  type AuthorizationHandlerEvent,
  AuthorizerHandler,
  type AuthorizerResponse,
  CustomAuthorizer,
} from '@lafken/api/main';

@CustomAuthorizer({
  name: 'pokemon-custom-auth',
  minify: false,
})
export class TrainerAuthorizer {
  @AuthorizerHandler()
  checkTrainer(e: AuthorizationHandlerEvent): AuthorizerResponse {
    console.log(e);

    return {
      allow: true,
      principalId: 'trainer@example.com',
    };
  }
}
