# NoteNest

NoteNest is a personal note-taking web application that gives each signed-in user a private workspace for creating, updating, organizing, and deleting notes.

## How it works

```text
React web client
      |
      | Sign in and JWT
      v
Amazon Cognito User Pool
      |
      | Authorized API request
      v
API Gateway HTTP API
      |
      v
AWS Lambda CRUD functions
      |
      v
Amazon DynamoDB notes table
```

The React client provides the user interface. Amazon Cognito manages user registration, sign-in, and JSON Web Tokens (JWTs). API Gateway validates JWTs before forwarding requests to Lambda. Each Lambda function uses the authenticated user’s Cognito subject as the note owner, then accesses only that user’s DynamoDB partition.

## AWS services

| Service | Role in NoteNest |
| --- | --- |
| Amazon Cognito | User accounts, email verification, sign-in, and JWT issuance. |
| Amazon API Gateway HTTP API | HTTPS API routes, CORS, and native JWT authorization. |
| AWS Lambda | Serverless handlers for creating, listing, reading, updating, and deleting notes. |
| Amazon DynamoDB | On-demand, encrypted storage for user-scoped notes. |
| AWS CloudFormation / SAM | Defines the repeatable infrastructure in code. |

## API

All routes require `Authorization: <Cognito ID token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/notes` | List the signed-in user’s notes. |
| `POST` | `/notes` | Create a note. |
| `GET` | `/notes/{noteId}` | Read one of the signed-in user’s notes. |
| `PUT` | `/notes/{noteId}` | Update one of the signed-in user’s notes. |
| `DELETE` | `/notes/{noteId}` | Delete one of the signed-in user’s notes. |

## Data and access control

Notes are stored with a partition key of `USER#<cognito-sub>` and a sort key of `NOTE#<note-id>`. The API derives the user ID from the verified JWT rather than accepting it from the request, preventing one user from requesting another user’s notes.

## Project structure

```text
frontend/        React and Vite web client
backend/         Node.js Lambda handlers and AWS SDK dependencies
infrastructure/  SAM/CloudFormation template
docs/            Architecture, data model, and wireframes
```

## Run locally


```powershell
cd C:\Users\larya\Developer\NoteNest\frontend
npm install
npm run dev
```

See [architecture.md](docs/architecture.md), [data-model.md](docs/data-model.md), and [wireframes.md](docs/wireframes.md) for the supporting design documentation.

