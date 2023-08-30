import { create, download, get, markdown, search } from "./controllers";

// ROUTES ---------------------------------------------------------------------
export default {
	id: "gitlab-api",
	handler: (router, context) => {
		const { env, logger } = context;

		// Search GitLab for repos
		router.get("/search", (req, res, next) =>
			search({ req, res, next, context })
		);

		// Post GitLab repo
		router.post("/create", (req, res, next) =>
			create({ req, res, next, context })
		);

		// Get GitLab repo
		router.get("/get", (req, res, next) => {
			get({ req, res, next, context });
		});

		// Download file
		router.get("/download", async (req, res, next) => {
			download({ req, res, next, context });
		});

		// Get content of Markdown file
		router.get("/markdown", async (req, res, next) => {
			markdown({ req, res, next, context });
		});
	},
};
