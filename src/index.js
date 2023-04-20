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

export default (router, { services, exceptions, env, logger, database }) => {
	const db = database.connect();

	// Search GitLab for repos
	router.get("/search", async (req, res) => {
		res.json(await searchGitLab(req.query.query, env.GITLAB_ACCESS_TOKEN));
	});

	// Post GitLab repo
	router.post("/post-repo", async (req, res) => {
		res.json(req.body);

		try {
			collection = "git_imports";
			item = req.body;

			// Add the new item to the collection
			const response = await db.collection(collection).insertOne(item);

			// Send the newly created item back as the response
			res.status(200).json(response.ops[0]);
		} catch (error) {
			console.error(error);
			res.status(500).send(error.message);
		}
	});
};
