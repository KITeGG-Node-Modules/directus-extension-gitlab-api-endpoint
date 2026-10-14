# KITeGG Directus GitLab API Endpoint

And endpoint to fetch repositories from GitLab RLP through Directus.

## 🔒 GitLab Access Token

To make this extension work you need to add a GitLab access token to your Directus configuration.

Add this to your Docker Compose configuration:

```yaml
directus:
    ...
    environment:
        ...

        GITLAB_ACCESS_TOKEN: YOUR_GITLAB_ACCESS_TOKEN
```

## Routes

- `GET /gitlab-api/search?query=`: search repositories in the KITeGG group.
- `POST /gitlab-api/create`: store a repository as a git import.
- `GET /gitlab-api/get/:repo`: first two levels of a repository with file metadata.
- `GET /gitlab-api/get/:repo?download=<path>`: raw file, or zip for a folder.
- `GET /gitlab-api/tree/:repo?path=<dir>`: every file below `path` (default: the root), recursively.

`:repo` is the GitLab project id. All routes need a logged-in Directus user, and the token needs read access to the project.

## 🚧 Development

```bash
npm run dev
```

## 📦 Production

```bash
npm run build
```
