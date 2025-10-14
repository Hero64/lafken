export type KeyOfClass<E extends Function> = keyof E['prototype'];

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type OnlyNumberString<T> = {
  [key in keyof T as T[key] extends string | number ? key : never]: T[key];
};

export type OnlyNumber<T> = {
  [key in keyof T as T[key] extends number ? key : never]: T[key];
};

export type Join<K, P> = K extends string
  ? P extends string
    ? `${K}::${P}`
    : never
  : never;

export type FlattenStacksByResource<TStacks, TResource extends string> = {
  [StackName in keyof TStacks]: TResource extends keyof TStacks[StackName]
    ? Join<
        TResource,
        Join<StackName & string, keyof TStacks[StackName][TResource] & string>
      >
    : never;
}[keyof TStacks];

export type ResourceIdentifiers<TStacks, TResource extends string> = {
  [K in keyof TStacks]: TResource extends keyof TStacks[K]
    ? keyof TStacks[K][TResource]
    : never;
}[keyof TStacks] &
  string;

export type ScopedResourceNames<TStacks, TResource extends string> = {
  [StackName in keyof TStacks]: TResource extends keyof TStacks[StackName]
    ? Join<StackName & string, keyof TStacks[StackName][TResource] & string>
    : never;
}[keyof TStacks];

export type OnlyOne<T> = {
  [K in keyof T]: Required<Pick<T, K>> & Partial<Record<Exclude<keyof T, K>, never>>;
}[keyof T];

export type OnlyOneKey<T> = {
  [K in keyof T]: {
    [P in K]: T[P];
  } & {
    [P in Exclude<keyof T, K>]?: never;
  };
}[keyof T];
