type SnakeToCamelCase<S extends string> =
  S extends `${infer First}_${infer Rest}`
    ? `${First}${Capitalize<SnakeToCamelCase<Rest>>}`
    : S;

export type Camelize<T> = T extends object
  ? T extends any[]
    ? { [K in keyof T]: Camelize<T[K]> }
    : { [K in keyof T as SnakeToCamelCase<string & K>]: Camelize<T[K]> }
  : T;

type CamelToSnakeCase<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? `${First extends Uppercase<First> ? "_" : ""}${Lowercase<First>}${CamelToSnakeCase<Rest>}`
    : S;

export type Snakify<T> = T extends object
  ? T extends any[]
    ? { [K in keyof T]: Snakify<T[K]> }
    : { [K in keyof T as CamelToSnakeCase<string & K>]: Snakify<T[K]> }
  : T;
