import { Readable } from 'stream';
import { BASE_URL } from "../constants.js";
import { checkAccess, handleResponseError } from "../utilities/index.js";

async function downloadFile(payload) {
	const { req, res, next, context } = payload;
	const { env, logger } = context;

	if (!env.GITLAB_ACCESS_TOKEN) {
		res.status(503);
		return res.send({ status: 503, message: 'Service Unavailable' });
	}
	if (!req.params.repo || !req.query.download) {
		res.status(400);
		return res.send({ status: 400, message: 'Bad Request' })
	}

	const repoURI = encodeURIComponent(req.params.repo);
	const REPO_ENDPOINT_URL = `${BASE_URL}/api/v4/projects/${repoURI}/repository`;
	const headers = { 'Private-Token': env.GITLAB_ACCESS_TOKEN };
	const filePath = encodeURIComponent(req.query.download);

	// Check if user is authorized
	checkAccess({ req, res, logger });

	let type = 'file'
	try {
		const treeResponse = await fetch(`${REPO_ENDPOINT_URL}/tree?path=${filePath}`, { headers })
		if (treeResponse.ok) type = 'folder'
	} catch { /* ignored */ }

	let fileResponse
	try {
		if (type === 'folder') {
			fileResponse = await fetch(`${REPO_ENDPOINT_URL}/archive.zip?path=${filePath}`, { headers, mode: 'same-origin' });
		} else {
			fileResponse = await fetch(`${REPO_ENDPOINT_URL}/files/${filePath}/raw?lfs=true`, { headers });
		}
	} catch (error) {
		logger.error(error);
		return next(error);
	}

	if (!fileResponse.ok) {
		return handleResponseError(res, fileResponse);
	}

	res.setHeader('Content-Type', fileResponse.headers.get('content-type'));
	res.setHeader('Content-Disposition', fileResponse.headers.get('content-disposition'));

	Readable.fromWeb(fileResponse.body).pipe(res);
}

export { downloadFile };
