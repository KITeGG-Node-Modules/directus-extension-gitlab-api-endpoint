function handleResponseError(response) {
	res.status(response.status);
	res.send({ message: response.body });
}

export default handleResponseError;
