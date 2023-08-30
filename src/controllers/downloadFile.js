import { lookup } from "mime-types";
import { BASE_URL } from "../constants.js";
import {
	checkAccess,
	getDefaultBranch,
	handleResponseError,
} from "../utilities/index.js";

async function downloadFile(payload) {
	const { req, res, next, context } = payload;
	const { env, logger } = context;

	const FILE_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${req.query.id}/repository`;
	const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };
	const filePath = encodeURIComponent(req.query.path);
	const branch = await getDefaultBranch(req.query.id, env, res);
	const type = req.query.path.includes(".") ? "file" : "folder";

	// Check if user is authorized
	checkAccess({ req, res, logger });

	try {
		if (type === "folder") {
			const fileResponse = await fetch(
				`${FILE_ENDPOINT_URL}/archive.zip?path=${filePath}`,
				{ headers, mode: "same-origin", method: "get" }
			);

			if (!fileResponse.ok) {
				handleResponseError(res, fileResponse);
			}

			const blob = await fileResponse.blob();

			res.type(blob.type);
			return blob.arrayBuffer().then((buf) => {
				res.send(Buffer.from(buf));
			});
		} else if (type === "file") {
			const fileResponse = await fetch(
				`${FILE_ENDPOINT_URL}/files/${filePath}?ref=${branch[0].name}`,
				{ headers }
			);

			if (!fileResponse.ok) {
				handleResponseError(res, fileResponse);
			}

			const fileInfo = await fileResponse.json();
			const mimeType = lookup(fileInfo.file_name);

			const content = fileInfo.content;
			const buffer = Buffer.from(content, "base64");

			res.setHeader("Content-Type", mimeType);
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=${fileInfo.file_name}`
			);

			return res.send(buffer);
		}
	} catch (error) {
		logger.error(error);
		return next(error);
	}
}

export { downloadFile };
