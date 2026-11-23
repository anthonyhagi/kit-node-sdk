/**
 * A Kit Field's data type. Other strings are accepted in case Kit adds types.
 */
export type KitFieldDataType =
  | "String"
  | "Text"
  | "Integer"
  | "Float"
  | "Boolean"
  | "Date"
  | "DateTime"
  | (string & {});

/** A Subscriber Signals field definition (not a subscriber's value). */
export interface KitField {
  name: string;
  data_type: KitFieldDataType;
  /** The only values the field stores; omitted for fields without a fixed list. */
  available_options?: string[] | undefined;
}

export interface ListKitFields {
  kit_fields: KitField[];
}
