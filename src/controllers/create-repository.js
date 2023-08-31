async function createRepository(payload) {
	const { req, res, next, context } = payload;
	const { ItemsService } = context.services;

	const gitImportService = new ItemsService("git_imports", {
		schema: req.schema,
		accountability: req.accountability,
	});

	gitImportService
		.createOne(req.body)
		.then(() => res.json("Git Repo successfully added"))
		.catch((error) => {
			return next(error);
		});
}

export { createRepository };
