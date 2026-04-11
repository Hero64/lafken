export type DocLocationType =
  | 'API'
  | 'AUTHORIZER'
  | 'MODEL'
  | 'RESOURCE'
  | 'METHOD'
  | 'PATH_PARAMETER'
  | 'QUERY_PARAMETER'
  | 'REQUEST_HEADER'
  | 'REQUEST_BODY'
  | 'RESPONSE'
  | 'RESPONSE_HEADER'
  | 'RESPONSE_BODY';

export interface DocLocation {
  type: DocLocationType;
  path?: string;
  method?: string;
  statusCode?: string;
  name?: string;
}

export interface DocExternalDocs {
  description?: string;
  url: string;
}

export interface DocServer {
  url?: string;
}

export interface DocInfoProperties {
  info: {
    title?: string;
    description?: string;
    version?: string;
  };
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  servers?: DocServer[];
}

export interface DocMethodProperties {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  externalDocs?: DocExternalDocs;
}

export interface DocParameterProperties {
  description?: string;
  required?: boolean;
  example?: string;
}

export interface DocBodyProperties {
  description?: string;
}

export interface DocResponseProperties {
  description?: string;
}

export interface DocModelProperties {
  title?: string;
  description?: string;
}

export interface DocAuthorizerProperties {
  description?: string;
}

export type DocProperties =
  | DocInfoProperties
  | DocMethodProperties
  | DocParameterProperties
  | DocBodyProperties
  | DocResponseProperties
  | DocModelProperties
  | DocAuthorizerProperties;

export interface CreateDocProps {
  id: string;
  location: DocLocation;
  properties: DocProperties;
}
