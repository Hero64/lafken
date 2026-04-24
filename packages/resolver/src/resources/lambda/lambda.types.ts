import type {
  LambdaMetadata,
  LambdaProps,
  ResourceMetadata,
  ServicesValues,
} from '@lafken/common';
import type { Construct } from 'constructs';
import type { GlobalContext } from '../../types';

export interface LambdaHandlerProps
  extends LambdaMetadata,
    Pick<ResourceMetadata, 'filename' | 'foldername' | 'originalName'> {
  filename: string;
  suffix?: string;
  principal?: string;
  sourceArn?: string;
  sourceAccount?: string;
}

export interface GetRoleArnProps {
  name: string;
  appContext: GlobalContext;
  moduleContext?: GlobalContext;
  services?: ServicesValues;
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
