import type { ParamMetadata, Source } from '../../../../../main';

export type ParamBySource = Partial<Record<Source, ParamMetadata[]>>;
