# Note data model

## DynamoDB table: `NoteNestNotes`

| Attribute | Type | Purpose |
| --- | --- | --- |
| `PK` | String | `USER#<cognito-sub>`; ownership boundary and partition key |
| `SK` | String | `NOTE#<note-id>`; direct lookup key scoped to the owner |
| `noteId` | String | Stable UUID exposed by the API |
| `title` | String | Note title, required, 1–160 characters |
| `content` | String | Note body, up to 50,000 characters |
| `createdAt` | String | ISO-8601 creation timestamp |
| `updatedAt` | String | ISO-8601 last-update timestamp |
| `tags` | List<String> | Optional labels, max 10 values |

## Access patterns

| Operation | DynamoDB operation | Key condition |
| --- | --- | --- |
| List my notes | `Query` | `PK = USER#<JWT sub>` and `begins_with(SK, NOTE#)`; API sorts by `updatedAt` |
| Create my note | `PutItem` | Writes under the JWT subject's partition |
| Read one note | `GetItem` | Owner partition plus `NOTE#<note-id>` |
| Update/delete one note | `UpdateItem` / `DeleteItem` | Owner partition plus known note sort key |

The API derives the owner partition only from the verified Cognito JWT. It never trusts an owner identifier supplied by the client.
