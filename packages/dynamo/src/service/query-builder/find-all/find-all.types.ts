import type { ClassResource } from '@lafken/common';
import type { InMemoryCache } from '../../cache/in-memory-cache';
import type { FindBuilderProps } from '../find/find.types';

export interface FindAllBuilderProps<E extends ClassResource>
  extends FindBuilderProps<E> {
  cache?: InMemoryCache;
  cacheTtl?: number;
}
