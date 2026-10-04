import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  BroadcastStatus,
  BroadcastSubscriberFilterResponseGroup,
  BroadcastSubscriberFilterResponseItem,
  CreateBroadcast,
  GetBroadcast,
  ListBroadcasts,
  ListSlimBroadcasts,
  UpdateBroadcast,
} from "~/index";

describe("broadcast response types", () => {
  it("accepts the default all-subscribers filter across full responses", () => {
    const broadcast = {
      id: 5,
      publication_id: 5,
      created_at: "2023-02-17T11:43:55Z",
      subject: "Hello!",
      preview_text: "Preview",
      description: "Description",
      content: "<p>Hello</p>",
      public: false,
      published_at: "2023-02-17T11:43:55Z",
      send_at: null,
      thumbnail_alt: null,
      thumbnail_url: null,
      public_url: null,
      email_address: "greetings@kit.dev",
      email_template: { id: 6, name: "Text Only" },
      subscriber_filter: [{ all: [{ type: "all_subscribers" }] }],
      status: "draft",
    } satisfies GetBroadcast["broadcast"];

    expectTypeOf(broadcast).toExtend<ListBroadcasts["broadcasts"][number]>();
    expectTypeOf(broadcast).toExtend<CreateBroadcast["broadcast"]>();
    expectTypeOf(broadcast).toExtend<UpdateBroadcast["broadcast"]>();
    expect(broadcast.subscriber_filter[0]!.all[0]).toEqual({
      type: "all_subscribers",
    });
  });

  it.each(["all", "any", "none"] as const)(
    "accepts %s filters and exposes IDs consistently across responses",
    (mode) => {
      const group: BroadcastSubscriberFilterResponseGroup = {
        [mode]: [
          { type: "tag", ids: [7] },
          { type: "segment", ids: [42] },
        ],
      };
      const filters = [group];
      expectTypeOf(filters).toEqualTypeOf<
        ListBroadcasts["broadcasts"][number]["subscriber_filter"]
      >();
      expectTypeOf(filters).toEqualTypeOf<
        GetBroadcast["broadcast"]["subscriber_filter"]
      >();
      expectTypeOf(filters).toEqualTypeOf<
        CreateBroadcast["broadcast"]["subscriber_filter"]
      >();
      expectTypeOf(filters).toEqualTypeOf<
        UpdateBroadcast["broadcast"]["subscriber_filter"]
      >();
      expectTypeOf(group[mode]?.[0]?.ids).toEqualTypeOf<number[] | undefined>();
      expect(group[mode]?.map((item) => item.ids)).toEqual([[7], [42]]);
    }
  );

  it("allows inactive groups to be absent or null while requiring targeted IDs", () => {
    const group = {
      any: [{ type: "tag", ids: [7] }],
      all: null,
      none: null,
    } satisfies BroadcastSubscriberFilterResponseGroup;
    expectTypeOf(group).toExtend<BroadcastSubscriberFilterResponseGroup>();
    expectTypeOf<{
      type: "tag";
    }>().not.toExtend<BroadcastSubscriberFilterResponseItem>();
    expectTypeOf<{
      type: "segment";
    }>().not.toExtend<BroadcastSubscriberFilterResponseItem>();
    expect(group.all).toBeNull();
  });

  it("exposes lifecycle status on every full response and slim lists", () => {
    expectTypeOf<
      ListBroadcasts["broadcasts"][number]["status"]
    >().toEqualTypeOf<BroadcastStatus>();
    expectTypeOf<
      ListSlimBroadcasts["broadcasts"][number]["status"]
    >().toEqualTypeOf<BroadcastStatus>();
    expectTypeOf<
      GetBroadcast["broadcast"]["status"]
    >().toEqualTypeOf<BroadcastStatus>();
    expectTypeOf<
      CreateBroadcast["broadcast"]["status"]
    >().toEqualTypeOf<BroadcastStatus>();
    expectTypeOf<
      UpdateBroadcast["broadcast"]["status"]
    >().toEqualTypeOf<BroadcastStatus>();
    expectTypeOf<keyof ListSlimBroadcasts["broadcasts"][number]>()
      .extract<"subscriber_filter">()
      .toEqualTypeOf<never>();
    const statuses = [
      "draft",
      "scheduled",
      "sending",
      "completed",
      "aborted",
    ] satisfies BroadcastStatus[];
    expect(statuses).toHaveLength(5);
  });
});
