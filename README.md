# NoteNest

NoteNest is a personal, authenticated note-taking web application. It uses a React client with an AWS serverless API.

## Day 1 foundation

- Architecture and security decisions: [`docs/architecture.md`](docs/architecture.md)
- Note data model and access patterns: [`docs/data-model.md`](docs/data-model.md)
- Low-fidelity UI wireframes: [`docs/wireframes.md`](docs/wireframes.md)
- SAM infrastructure template: [`infrastructure/template.yaml`](infrastructure/template.yaml)
- React starter application: [`frontend`](frontend)

## Intended local workflow

```powershell
cd frontend
npm install
npm run dev
```

After AWS authentication and SAM installation are complete, deploy the infrastructure from `infrastructure` with SAM. The template intentionally creates the data store and authentication boundary on Day 1; Lambda/API resources are added on Day 2.
