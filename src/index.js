import {
	createRepository,
	downloadFile,
	getMarkdownContent,
	getRepository,
	searchGitLab,
} from "./controllers";

// ROUTES ---------------------------------------------------------------------
export default {
	id: "gitlab-api",
	handler: (router, context) => {
		// Search GitLab for repositories
		router.get("/search", (req, res, next) =>
			searchGitLab({ req, res, next, context })
		);

		// Post GitLab repo to Direcuts
		router.post("/create", (req, res, next) =>
			createRepository({ req, res, next, context })
		);

		// Get repository from GitLab
		router.get("/get/:repo", (req, res, next) => {
			if (req.query.download) {
				// Download file from repository
				downloadFile({ req, res, next, context });
			} else {
				// Get repository from GitLab
				getRepository({ req, res, next, context });
			}
		});

		// Download file from repository
		router.get("/download", async (req, res, next) => {
			downloadFile({ req, res, next, context });
		});

		// Get content of markdown file from repository
		router.get("/markdown", async (req, res, next) => {
			getMarkdownContent({ req, res, next, context });
		});
	},
};
