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

## 🚧 Development

```bash
npm run dev
```

## 📦 Production

```bash
npm run build
```
