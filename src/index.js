const BASE_URL = "https://gitlab.rlp.net";
const GROUP = "21057"; // equals to KITeGG on RLP GitLab

async function searchGitLab(search, token) {
	// Construct the search endpoint URL
	const SEARCH_ENDPOINT_URL = `${BASE_URL}/api/v4/groups/${GROUP}/search?scope=projects&search=${search}`;
	const headers = { "Private-Token": token };

	// Fetch repos
	const response = await fetch(SEARCH_ENDPOINT_URL, { headers });
	const data = await response.json();

	return data;
}

// Create a route where I could pass in a search query

export default (router, { env, logger }) => {
	// Search GitLab
	router.get("/search", async (req, res) => {
		res.json(await searchGitLab(req.query.query, env.GITLAB_ACCESS_TOKEN));
	});
};
