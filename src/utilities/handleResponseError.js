function handleResponseError(response) {
	res.status(response.status);
	return res.send({ message: response.body });
}

export default handleResponseError;
