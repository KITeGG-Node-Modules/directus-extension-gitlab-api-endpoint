import { BASE_URL } from "../variables.js";
import { checkAccess, handleResponseError } from "../utilities";

async function markdown(payload) {
	const { req, res, next, context } = payload;
	const { env, logger } = context;

	// Check if user is authorized
	checkAccess({ req, res, logger });

	try {
		// Construct endpoint for single file information
		const FILE_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${req.query.id}/repository/files/`;
		const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };

		const filePath = req.query.path.replace(/\//g, "%2F");

		let markdownContent;

		// Fetch markdown content
		markdownContent = await fetch(FILE_ENDPOINT_URL + filePath + `/raw`, {
			headers,
		});

		// Check if markdown content was fetched successfully
		if (!markdownContent.ok) {
			handleResponseError(res, markdownContent);
		}

		const markdownText = await markdownContent.text();

		return res.json(markdownText);
	} catch (error) {
		logger.error(error);
		return next(error);
	}
}

export { markdown };
