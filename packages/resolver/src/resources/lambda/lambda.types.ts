import type {
  LambdaMetadata,
  LambdaProps,
  ResourceMetadata,
  ServicesValues,
} from '@alicanto/common';
import type { Construct } from 'constructs';
import type { GlobalContext } from '../../types';

export interface LambdaHandlerProps
  extends LambdaMetadata,
    Pick<ResourceMetadata, 'filename' | 'foldername'> {
  filename: string;
  suffix?: string;
  principal?: string;
}

export interface GetRoleArnProps {
  name: string;
  scope: Construct;
  appContext: GlobalContext;
  moduleContext?: GlobalContext;
  services?: ServicesValues[];
}

export interface CommonContextProps {
  appContext: GlobalContext;
  moduleContext?: GlobalContext;
  lambda?: LambdaProps;
}

export interface GetCurrentOrContextValueProps<
  T extends keyof Omit<GlobalContext, 'contextCreator'>,
> extends CommonContextProps {
  key: T;
  defaultValue?: GlobalContext[T];
}

export interface GetEnvironmentProps extends CommonContextProps {
  id: string;
  scope: Construct;
}
