import { lookup } from "mime-types";
import { BASE_URL } from "../constants.js";
import { checkAccess, handleResponseError } from "../utilities/index.js";

async function getRepository(payload) {
	const { req, res, next, context } = payload;
	const { env, logger } = context;

	// Check if user is authorized
	checkAccess({ req, res, logger });

	try {
		// Construct the repo endpoint URL
		const REPO_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${req.params.repo}/repository`;
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

		// Construct the folder endpoint URL
		const FIRST_LEVEL_FOLDER_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/tree`;

		// Fetch first level folder
		const response = await fetch(`${FIRST_LEVEL_FOLDER_ENDPOINT_URL}?per_page=-1`, {
			headers,
		});

		// Check if first level folder fetch is ok
		if (!response.ok) {
			handleResponseError(res, response);
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
					`${FIRST_LEVEL_FOLDER_ENDPOINT_URL}?path=${item.path}&per_page=-1`,
					{
						headers,
					}
				);

				// Check if files metadata fetch is ok
				if (!response.ok) {
					handleResponseError(res, response);
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
				handleResponseError(res, fileResponse);
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
					const filePath = encodeURIComponent(file.path);

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
		return res.json({
			default_branch: defaultBranch[0].name,
			folders: foldersWithFilesData,
			files: files,
		});
	} catch (error) {
		logger.error(error);
		return next(error);
	}
}

export { getRepository };
