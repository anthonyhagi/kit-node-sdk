import { describe, expectTypeOf, it } from "vitest";
import type {
  BroadcastSubscriberFilterGroup,
  CreateBroadcastParams,
  TypedSubscriberFilterItem,
  UpdateBroadcastParams,
} from "~/index";

describe("broadcast filter input compatibility", () => {
  it("preserves create's array, legacy object, and null inputs", () => {
    expectTypeOf<CreateBroadcastParams["subscriber_filter"]>().toEqualTypeOf<
      BroadcastSubscriberFilterGroup[] | BroadcastSubscriberFilterGroup | null
    >();
    expectTypeOf<{
      any: TypedSubscriberFilterItem[];
    }>().toExtend<BroadcastSubscriberFilterGroup>();
    expectTypeOf<{ all: null }>().toExtend<BroadcastSubscriberFilterGroup>();
  });

  it("keeps every update group key required and all non-null", () => {
    type Group = UpdateBroadcastParams["subscriber_filter"][number];
    type PreviousGroup = {
      all: TypedSubscriberFilterItem[];
      any: TypedSubscriberFilterItem[] | null;
      none: TypedSubscriberFilterItem[] | null;
    };
    expectTypeOf<Group>().toExtend<PreviousGroup>();
    expectTypeOf<PreviousGroup>().toExtend<Group>();
    expectTypeOf<Group["all"]>().toEqualTypeOf<TypedSubscriberFilterItem[]>();
    expectTypeOf<Group["any"]>().toEqualTypeOf<
      TypedSubscriberFilterItem[] | null
    >();
    expectTypeOf<Group["none"]>().toEqualTypeOf<
      TypedSubscriberFilterItem[] | null
    >();
    expectTypeOf<{ all: TypedSubscriberFilterItem[] }>().not.toExtend<Group>();
    expectTypeOf<{ all: null; any: null; none: null }>().not.toExtend<Group>();
    expectTypeOf<{
      all: TypedSubscriberFilterItem[];
      any: undefined;
      none: null;
    }>().not.toExtend<Group>();
  });
});
