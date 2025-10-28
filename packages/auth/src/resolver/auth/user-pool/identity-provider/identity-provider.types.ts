import type {
  CustomAttributesMetadata,
  StandardAttributeMetadata,
} from '../../../../main';
import type { IdentityProvider } from '../user-pool.types';

export type IdentityProviderProps = IdentityProvider<any> & {
  userPoolId: string;
  attributeByName: Record<string, CustomAttributesMetadata | StandardAttributeMetadata>;
};
