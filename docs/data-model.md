# Note data model

## DynamoDB table: `NoteNestNotes`

| Attribute | Type | Purpose |
| --- | --- | --- |
| `PK` | String | `USER#<cognito-sub>`; ownership boundary and partition key |
| `SK` | String | `NOTE#<created-at-ISO>#<note-id>`; time-ordered sort key |
| `noteId` | String | Stable UUID exposed by the API |
| `title` | String | Note title, required, 1–160 characters |
| `content` | String | Note body, up to 50,000 characters |
| `createdAt` | String | ISO-8601 creation timestamp |
| `updatedAt` | String | ISO-8601 last-update timestamp |
| `tags` | List<String> | Optional labels, max 10 values |

## Day 2 access patterns

| Operation | DynamoDB operation | Key condition |
| --- | --- | --- |
| List my notes | `Query` | `PK = USER#<JWT sub>` and `begins_with(SK, NOTE#)` |
| Create my note | `PutItem` | Writes under the JWT subject's partition |
| Read one note | `Query` / `GetItem` | Owner partition plus known note sort key |
| Update/delete one note | `UpdateItem` / `DeleteItem` | Owner partition plus known note sort key |

For direct lookup by `noteId`, the Day 2 API can encode the created timestamp in a signed opaque identifier or maintain a small lookup item in the same owner partition. The initial user-scoped list flow does not need a secondary index.
