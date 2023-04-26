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

async function getRepo(id, token) {
	// Construct the files endpoint URL
	const REPO_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${id}/repository/tree`;
	const headers = { "Private-Token": token };

	// Fetch files
	const response = await fetch(REPO_ENDPOINT_URL, { headers });
	const files = await response.json();

	return files;
}

// ROUTES ---------------------------------------------------------------------
export default (router, { services, env }) => {
	// Search GitLab for repos
	router.get("/search", async (req, res) => {
		res.json(await searchGitLab(req.query.query, env.GITLAB_ACCESS_TOKEN));
	});

	// Post GitLab repo
	router.post("/create", async (req, res, next) => {
		const { ItemsService } = services;

		const gitImportService = new ItemsService("git_imports", {
			schema: req.schema,
			accountability: req.accountability,
		});

		gitImportService
			.createOne(req.body)
			.then(() => res.json("Git Repo successfully added"))
			.catch((error) => {
				return next(error);
			});
	});

	// Get GitLab repo
	router.get("/get", async (req, res) => {
		res.json(await getRepo(req.query.id, env.GITLAB_ACCESS_TOKEN));
	});
};
