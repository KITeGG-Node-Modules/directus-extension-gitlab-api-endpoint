import { BASE_URL, GROUP } from "../constants.js";
import { checkAccess, handleResponseError } from "../utilities/index.js";

async function searchGitLab(payload) {
	const { req, res, next, context } = payload;
	const { env, logger } = context;

	// Check if user is authorized
	checkAccess({ req, res, logger });

	try {
		// Construct the search endpoint URL
		const SEARCH_ENDPOINT_URL = `${BASE_URL}/api/v4/groups/${GROUP}/search?scope=projects&search=${req.query.query}`;
		const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };

		// Fetch repos
		const response = await fetch(SEARCH_ENDPOINT_URL, { headers });

		if (!response.ok) {
			handleResponseError(res, response);
		}

		const data = await response.json();

		return res.json(data);
	} catch (error) {
		logger.error(error);
		return next(error);
	}
}

export { searchGitLab };
