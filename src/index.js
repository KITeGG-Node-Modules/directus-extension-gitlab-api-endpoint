import { lookup } from "mime-types";

const BASE_URL = "https://gitlab.rlp.net";
const GROUP = "21057"; // equals to KITeGG on RLP GitLab

// Function to search GitLab for repos
async function searchGitLab(search, token) {
	// Construct the search endpoint URL
	const SEARCH_ENDPOINT_URL = `${BASE_URL}/api/v4/groups/${GROUP}/search?scope=projects&search=${search}`;
	const headers = { "Private-Token": token };

	// Fetch repos
	const response = await fetch(SEARCH_ENDPOINT_URL, { headers });
	const data = await response.json();

	return data;
}

// Function to the repository with all its files and folders
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

	// Construct the folder endpoint URL
	const FIRST_LEVEL_FOLDER_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/tree`;

	// Fetch first level folder
	const response = await fetch(FIRST_LEVEL_FOLDER_ENDPOINT_URL, { headers });
	const firstLevel = await response.json();

	// Filter out folders
	const folders = firstLevel.filter((item) => item.type === "tree");

	// Filter out files
	const files = firstLevel.filter((item) => item.type !== "tree");

	// Fetch files metadata for every object in folders and add them to the corresponding object
	const foldersWithFilesMetadata = await Promise.all(
		folders.map(async (item) => {
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

	// Construct the file endpoint URL
	const FILE_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/files/`;

	//Fetch files data for evers files array in every object of foldersWithFilesMetadata and add them to the corresponding object
	const foldersWithFilesData = await Promise.all(
		foldersWithFilesMetadata.map(async (folder) => {
			const files = await Promise.all(
				folder.files.map(async (file) => {
					// Replace / with %2F in file path
					const filePath = file.path.replace(/\//g, "%2F");

					// Get file data
					const fileResponse = await fetch(
						FILE_ENDPOINT_URL + filePath + `/?ref=${defaultBranch[0].name}`,
						{
							headers,
						}
					);

					const fileData = await fileResponse.json();

					// Get file blame data
					const blameResponse = await fetch(
						FILE_ENDPOINT_URL +
							filePath +
							`/blame?ref=${defaultBranch[0].name}`,
						{
							headers,
						}
					);

					const blameData = await blameResponse.json();

					return {
						...file,
						...blameData,
						...fileData,
					};
				})
			);

			return {
				...folder,
				files,
			};
		})
	);

	// Split into files and repositories (notebooks)
	foldersWithFilesData.map((folder) => {
		const files = folder.files.filter((item) => !item.name.includes(".ipynb"));
		const repositories = folder.files.filter((item) =>
			item.name.includes(".ipynb")
		);

		folder.files = files;
		folder.repositories = repositories;
	});

	// Compute mimeType of files from file name
	files.map((file) => {
		const fileName = file.name;
		const mimeType = lookup(fileName);

		file.mimeType = mimeType;
	});

	foldersWithFilesData.map((folder) => {
		folder.files.map((file) => {
			const fileName = file.name;
			const mimeType = lookup(fileName);

			file.mimeType = mimeType;
		});
	});

	// Return an object with the default branch, the first level folders and files
	return {
		defaultBranch: defaultBranch[0].name,
		folders: foldersWithFilesData,
		files: files,
	};
}

// ROUTES ---------------------------------------------------------------------
export default (router, { services, env }) => {
	// Search GitLab for repos
	router.get("/search", async (req, res) => {
		res.json(await searchGitLab(req.query.query, env.GITLAB_ACCESS_TOKEN));
	});

	// Post GitLab repo
	router.post("/add", async (req, res, next) => {
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
