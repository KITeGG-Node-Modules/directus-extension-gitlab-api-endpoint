function handleResponseError(response) {
	res.status(response.status);
	return res.send({ body: response.json() });
}

export default handleResponseError;
