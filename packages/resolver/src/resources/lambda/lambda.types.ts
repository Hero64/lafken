import type { LambdaMetadata, LambdaProps, ServicesValues } from '@alicanto/common';
import type { Construct } from 'constructs';
import type { GlobalContext } from '../../types';

export interface LambdaHandlerProps extends LambdaMetadata {
  pathName: string;
  filename: string;
  suffix?: string;
  excludeFiles?: string[];
  principal?: string;
  minify?: boolean;
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
  scope: Construct;
}
