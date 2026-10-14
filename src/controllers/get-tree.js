import { BASE_URL } from "../constants.js";
import { handleResponseError } from "../utilities/index.js";

// Flat list of every file in a repository (or below ?path=), recursively.
// `:repo` is the project id or the url-encoded project path.
async function getTree(payload) {
	const { req, res, next, context } = payload;
	const { env, logger } = context;

	if (!req.accountability?.user) {
		res.status(401);
		return res.send({ message: "api_errors.unauthorized" });
	}
	if (!env.GITLAB_ACCESS_TOKEN) {
		res.status(503);
		return res.send({ status: 503, message: "Service Unavailable" });
	}

	const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };
	const repoURI = encodeURIComponent(req.params.repo);
	const path = req.query.path ? `&path=${encodeURIComponent(req.query.path)}` : "";

	try {
		const files = [];
		let page = "1";

		while (page) {
			const response = await fetch(
				`${BASE_URL}/api/v4/projects/${repoURI}/repository/tree?recursive=true&per_page=100&page=${page}${path}`,
				{ headers }
			);

			if (!response.ok) {
				return handleResponseError(res, response);
			}

			const items = await response.json();
			files.push(...items.filter((item) => item.type === "blob"));
			page = response.headers.get("x-next-page");
		}

		return res.json({ files });
	} catch (error) {
		logger.error(error);
		return next(error);
	}
}

export { getTree };
