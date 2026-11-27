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

/** A value stored in a subscriber's Kit Field. */
export type KitFieldValue = string | number | boolean;

export interface UpdateSubscriberKitFieldsParams {
  /**
   * Kit Field names, as {@link ListKitFields} lists them, mapped to the
   * corrected values. Include at least one field. Fields with
   * `available_options` only accept those values. `null` removes the value
   * written through the API and leaves values from other sources in place.
   */
  kit_fields: Record<string, KitFieldValue | null>;
}

export interface UpdateSubscriberKitFields {
  subscriber: {
    id: number;
    /** The subscriber's current Kit Fields after the write. */
    kit_fields: Record<string, KitFieldValue>;
  };
}
