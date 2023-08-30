import { create, get, search } from "./controllers";

import { BASE_URL } from "./variables.js";
import { handleResponseError } from "./utilities/handleResponseError.js";
import { getDefaultBranch } from "./utilities/getDefaultBranch.js";

// ROUTES ---------------------------------------------------------------------
export default {
	id: "gitlab-api",
	handler: (router, context) => {
		const { env, logger } = context;

		// Search GitLab for repos
		router.get("/search", (req, res, next) =>
			search({ req, res, next, context })
		);

		// Post GitLab repo
		router.post("/create", (req, res, next) =>
			create({ req, res, next, context })
		);

		// Get GitLab repo
		router.get("/get", (req, res, next) => {
			get({ req, res, next, context });
		});

		// Download file
		router.get("/download", async (req, res, next) => {
			const FILE_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${req.query.id}/repository`;
			const headers = { "Private-Token": env.GITLAB_ACCESS_TOKEN };
			const filePath = encodeURIComponent(req.query.path);
			const branch = await getDefaultBranch(req.query.id, env, res);
			const type = req.query.path.includes(".") ? "file" : "folder";

			// Check if user is logged in
			if (!req.accountability.user) {
				res.status(401);
				return res.send({ message: "api_errors.unauthorized" });
			}

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
					handleResponseError(res, markdownContent);
				}

				const markdownText = await markdownContent.text();

				return res.json(markdownText);
			} catch (error) {
				logger.error(error);
				return next(error);
			}
		});
	},
};
