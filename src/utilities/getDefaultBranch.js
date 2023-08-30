import { BASE_URL } from "../constants.js";
import { handleResponseError } from "./handleResponseError.js";

async function getDefaultBranch(id, env, res) {
	// Construct the repo endpoint URL
	const REPO_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${id}/repository`;
	const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };

	// Construct the branches endpoint URL
	const BRANCH_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/branches`;

	// Fetch branches
	const branchesResponse = await fetch(BRANCH_ENDPOINT_URL, { headers });

	if (!branchesResponse.ok) {
		handleResponseError(res, branchesResponse);
	}

	const branches = await branchesResponse.json();

	// Filter default branch
	const defaultBranch = branches.filter((branch) => branch.default);

	return defaultBranch;
}

export { getDefaultBranch };
