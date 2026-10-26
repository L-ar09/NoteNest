# NoteNest architecture

```text
Browser (React + Vite)
        |
        | sign-up / sign-in
        v
Amazon Cognito User Pool
        |
        | JWT (Day 2)
        v
API Gateway HTTP API
        |
        | Lambda proxy integrations (Day 2)
        v
Lambda CRUD functions
        |
        | scoped IAM permissions
        v
Amazon DynamoDB: NoteNestNotes
```

## Decisions

- Use a Cognito **user pool** for sign-up, sign-in, and JWT issuance. An identity pool is not needed because the browser will call the API, not AWS services directly.
- Use DynamoDB in **on-demand** capacity mode. Notes are naturally accessed by authenticated owner and time, which fits a stable key-based access pattern.
- Use API Gateway **HTTP API** with a JWT authorizer on Day 2. It is the appropriate lightweight front door for the CRUD API.
- Use one Lambda Event Function per CRUD responsibility on Day 2. Each function receives only the DynamoDB actions it needs.
- Keep every regional resource in the project's selected Region: `ap-southeast-2` (as currently configured by the AWS CLI).

## Security baseline

- The React app uses a Cognito public app client with no client secret.
- Cognito email is the primary sign-in identifier and self-service registration requires email verification.
- The DynamoDB primary key contains the Cognito subject, so every note is partitioned by owner.
- Day 2 handlers must derive `userId` from the verified JWT; they must never accept an owner ID from the request body.
- CloudFormation/SAM will create least-privilege Lambda execution roles. No user data is public.
