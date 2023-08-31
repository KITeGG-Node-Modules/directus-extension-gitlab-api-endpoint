function checkAccess(payload) {
	const { req, res, logger } = payload;

	if (!req.accountability.user) {
		res.status(401);
		return res.send({ message: "api_errors.unauthorized" });
	} else {
		logger.info("User is authorized");
	}
}

export { checkAccess };
