# Atlas trigger: `records-case-identifiers`

Assigns and locks two identifiers on records of the Case resource
(`6a1f45cbec51d33e953e4a52`).

## `cecis_number` (from `cecis_case`)

| `cecis_case` | `cecis_number`                          |
| ------------ | --------------------------------------- |
| `true`       | `UA` + 4-digit incremental (`UA0001`)   |
| `false`      | `NC` + 6-digit incremental (`NC000001`) |

Once `cecis_case` is set it cannot change anymore, and neither can the number:
any edit changing them is reverted. A record needing to switch must be cloned;
the clone (an insert) always receives a new number.

## `case_id` (from `military`)

Formatted like the platform incremental ID (`<year>-<letter><8 digits>`), the
letter depending on the case's own `military` boolean. The patient record has
no civilian/military indicator, so the case field is the source.

| `military` | `case_id`                     |
| ---------- | ----------------------------- |
| `false`    | `<year>-C########` (Civilian) |
| `true`     | `<year>-M########` (Military) |

The year is the record creation year and sequences are per year and per
letter. Once assigned, `case_id` cannot change: edits are reverted. `military`
itself is not locked; changing it later does not change the `case_id`.

Records where `cecis_case` or `military` is not set (neither true nor false)
get no corresponding identifier until the field is set.

The form must declare a `case_id` text question (read-only, hidden if wanted)
so the field is registered on the resource and available in grids. The
trigger writes `data.case_id` whether or not the question exists.

## Trigger configuration (Atlas UI > Triggers > Add Trigger)

| Setting               | Value                                                     |
| --------------------- | --------------------------------------------------------- |
| Trigger type          | Database                                                  |
| Name                  | `records-case-identifiers`                                |
| Enabled               | On                                                        |
| Event ordering        | On (required: numbers are computed from existing records) |
| Cluster               | your cluster (linked data source name `mongodb-atlas`)    |
| Database / Collection | your database / `records`                                 |
| Operation type        | Insert, Update, Replace                                   |
| Full document         | On                                                        |
| Document preimage     | On                                                        |
| Match expression      | see below                                                 |
| Function              | paste `function.js`                                       |

Match expression (limits invocations to the Case resource):

```json
{ "fullDocument.resource": { "$oid": "6a1f45cbec51d33e953e4a52" } }
```

If the linked data source is not named `mongodb-atlas`, change `SERVICE_NAME`
at the top of `function.js`.

## Pre-images

"Document preimage" needs pre-images enabled on the collection. The migration
`1789456659300-set-case-identifiers.ts` enables it; to do it by hand:

```js
db.runCommand({
  collMod: 'records',
  changeStreamPreAndPostImages: { enabled: true },
});
```

Without pre-images the function cannot know the previous values and throws on
updates instead of guessing, so the change is not reverted.

## Numbering

No extra collection is used. The next number is the highest value already
stored on the resource for the prefix + 1, checked for uniqueness. This is
only safe because "Event ordering" is enabled on the trigger, which makes
invocations sequential. Keep it enabled.

## Rollout order

1. Run the migration: `npm run migrate:up 1789456659300-set-case-identifiers.ts`
2. Create and enable the trigger.

Either order works (the trigger accepts identifiers written by the migration),
but running the migration first avoids one trigger invocation per migrated
record.
