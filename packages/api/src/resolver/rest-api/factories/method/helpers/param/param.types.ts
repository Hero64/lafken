import type { ApiParamMetadata, Source } from '../../../../../../main';

export type ParamBySource = Partial<Record<Source, ApiParamMetadata[]>>;
