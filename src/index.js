import { lookup } from "mime-types";

const BASE_URL = "https://gitlab.rlp.net";
const GROUP = "21057"; // equals to KITeGG on RLP GitLab

// ROUTES ---------------------------------------------------------------------
export default {
	id: "gitlab-api",
	handler: (router, { services, env, logger }) => {
		// Search GitLab for repos
		router.get("/search", async (req, res, next) => {
			// Check if user is logged in
			if (!req.accountability.user) {
				res.status(401);
				return res.send({ message: "api_errors.unauthorized" });
			}

			try {
				// Construct the search endpoint URL
				const SEARCH_ENDPOINT_URL = `${BASE_URL}/api/v4/groups/${GROUP}/search?scope=projects&search=${req.query.query}`;
				const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };

				// Fetch repos
				const response = await fetch(SEARCH_ENDPOINT_URL, { headers });

				if (!response.ok) {
					throw new Error("GitLab API error: Failed to search for repos");
				}

				const data = await response.json();

				res.json(data);
			} catch (error) {
				logger.error(error);
				return next(error);
			}
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
		router.get("/get", async (req, res, next) => {
			// Check if user is logged in
			if (!req.accountability.user) {
				res.status(401);
				return res.send({ message: "api_errors.unauthorized" });
			}

			try {
				// Construct the repo endpoint URL
				const REPO_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${req.query.id}/repository`;
				const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };

				// Construct the branches endpoint URL
				const BRANCH_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/branches`;

				// Fetch branches
				const branchesResponse = await fetch(BRANCH_ENDPOINT_URL, { headers });

				if (!branchesResponse.ok) {
					throw new Error("GitLab API error: Failed to fetch branches");
				}

				const branches = await branchesResponse.json();

				// Filter default branch
				const defaultBranch = branches.filter((branch) => branch.default);

				// Construct the folder endpoint URL
				const FIRST_LEVEL_FOLDER_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/tree`;

				// Fetch first level folder
				const response = await fetch(FIRST_LEVEL_FOLDER_ENDPOINT_URL, {
					headers,
				});

				// Check if first level folder fetch is ok
				if (!response.ok) {
					throw new Error(
						"GitLab API error: Failed to fetch first level folder"
					);
				}

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

						// Check if files metadata fetch is ok
						if (!response.ok) {
							throw new Error(
								"GitLab API error: Failed to fetch files metadata"
							);
						}

						const data = await response.json();

						return { ...item, files: data };
					})
				);

				// Construct the file endpoint URL
				const FILE_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/files/`;

				// Fetch file data for a given file path
				async function fetchFileData(filePath, headers) {
					const fileResponse = await fetch(
						FILE_ENDPOINT_URL + filePath + `/?ref=${defaultBranch[0].name}`,
						{
							headers: headers,
						}
					);

					// Check if file data fetch is ok
					if (!fileResponse.ok) {
						throw new Error("GitLab API error: Failed to fetch file data");
					}

					return fileResponse.json();
				}

				// Fetch files data for each file in a folder
				async function fetchFilesData(folder, headers) {
					const files = await Promise.all(
						folder.files.map(async (file) => {
							// Check from file.path what mime type the file has
							const mimeType = file.path.split(".").pop();
							const checkMimeTypes = ["jpg", "jpeg", "png", "gif"];

							if (file.type === "tree" || !checkMimeTypes.includes(mimeType)) {
								return file;
							}

							// If file path has a slash, replace it with %2F
							const filePath = file.path.replace(/\//g, "%2F");

							const fileData = await fetchFileData(filePath, headers);

							return {
								...file,
								...fileData,
							};
						})
					);

					return {
						...folder,
						files,
					};
				}

				// Fetch files data for each folder in foldersWithFilesMetadata
				const foldersWithFilesData = await Promise.all(
					foldersWithFilesMetadata.map(async (folder) => {
						return fetchFilesData(folder, { ...headers, method: "HEAD" });
					})
				);

				// Split into files and repositories (notebooks)
				foldersWithFilesData.map((folder) => {
					const files = folder.files.filter(
						(item) => !item.name.includes(".ipynb")
					);
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
				res.json({
					default_branch: defaultBranch[0].name,
					folders: foldersWithFilesData,
					files: files,
				});
			} catch (error) {
				logger.error(error);
				return next(error);
			}
		});

		// Get content of Markdown file
		router.get("/markdown", async (req, res, next) => {
			// Check if user is logged in
			if (!req.accountability.user) {
				res.status(401);
				return res.send({ message: "api_errors.unauthorized" });
			}

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
					throw new Error("Failed to fetch markdown content");
				}

				const markdownText = await markdownContent.text();

				res.json(markdownText);
			} catch (error) {
				logger.error(error);
				return next(error);
			}
		});
	},
};
