import type { ApiFieldMetadata, Source } from '../../../../../../main';

export type ParamBySource = Partial<Record<Source, ApiFieldMetadata[]>>;
