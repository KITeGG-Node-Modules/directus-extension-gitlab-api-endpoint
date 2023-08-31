import { lookup } from "mime-types";
import { BASE_URL } from "../constants.js";
import { checkAccess, handleResponseError } from "../utilities/index.js";

async function downloadFile(payload) {
	const { req, res, next, context } = payload;
	const { env, logger } = context;

	const REPO_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${req.params.repo}/repository`;
	const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };
	const filePath = encodeURIComponent(req.query.download);
	const type = req.query.download.includes(".") ? "file" : "folder";

	// Check if user is authorized
	checkAccess({ req, res, logger });

	try {
		if (type === "folder") {
			const ARCHIVE_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/archive.zip?path=${filePath}`;

			const archiveResponse = await fetch(ARCHIVE_ENDPOINT_URL, {
				headers,
				mode: "same-origin",
				method: "get",
			});

			if (!archiveResponse.ok) {
				handleResponseError(res, archiveResponse);
			}

			const blob = await archiveResponse.blob();

			res.type(blob.type);
			return blob.arrayBuffer().then((buf) => {
				res.send(Buffer.from(buf));
			});
		} else if (type === "file") {
			const FILE_ENDPOINT_URL = `${REPO_ENDPOINT_URL}/files/${filePath}/raw`;

			const fileResponse = await fetch(FILE_ENDPOINT_URL, { headers });

			if (!fileResponse.ok) {
				handleResponseError(res, fileResponse);
			}

			const title = fileResponse.headers.get("x-gitlab-file-name");
			const mimeType = lookup(title);

			const fileContent = await fileResponse.blob();

			res.type(mimeType || fileContent.type || "application/octet-stream");
			res.setHeader("Content-Disposition", `attachment; filename=${title}`);
			return fileContent.arrayBuffer().then((buf) => {
				res.send(Buffer.from(buf));
			});
		}
	} catch (error) {
		logger.error(error);
		return next(error);
	}
}

export { downloadFile };
