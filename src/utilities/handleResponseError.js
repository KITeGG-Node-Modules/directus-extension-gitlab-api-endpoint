function handleResponseError(res, response) {
	res.status(response.status);
	return res.send({
		type: response.type,
		status: response.status,
		message: response.statusText,
		body: response.body,
	});
}

export default handleResponseError;
