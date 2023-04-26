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
	// Construct the repo endpoint URL
	const REPO_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${id}/repository`;
	const headers = { "Private-Token": token };

	// Construct the branches endpoint URL
	const BRANCH_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/branches`;

	// Fetch branches
	const branchesResponse = await fetch(BRANCH_ENDPOINT_URL, { headers });
	const branches = await branchesResponse.json();

	// Filter default branch
	const defaultBranch = branches.filter((branch) => branch.default);

	// Construct the first level folder endpoint URL
	const FIRST_LEVEL_FOLDER_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/tree`;

	// Fetch first level folder
	const response = await fetch(FIRST_LEVEL_FOLDER_ENDPOINT_URL, { headers });
	const firstLevel = await response.json();

	// Filter out folders
	const firstLevelFolder = firstLevel.filter((item) => item.type === "tree");

	// Filter out files
	const firstLevelFiles = firstLevel.filter((item) => item.type !== "tree");

	// Fetch files for every entry in firstLevelFolder and add them to the firstLevelFolder object
	const firstLevelFolderWithFiles = await Promise.all(
		firstLevelFolder.map(async (item) => {
			const response = await fetch(
				`${FIRST_LEVEL_FOLDER_ENDPOINT_URL}?path=${item.path}`,
				{
					headers,
				}
			);
			const data = await response.json();
			return { ...item, files: data };
		})
	);

	// Return an object with the default branch, the first level folders and files
	return {
		defaultBranch: defaultBranch[0].name,
		folders: firstLevelFolderWithFiles,
		files: firstLevelFiles,
	};
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
	router.get("/get-repo", async (req, res) => {
		res.json(await getRepo(req.query.id, env.GITLAB_ACCESS_TOKEN));
	});
};
