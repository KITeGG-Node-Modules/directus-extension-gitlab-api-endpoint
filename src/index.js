import {
	createRepository,
	downloadFile,
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
	},
};
