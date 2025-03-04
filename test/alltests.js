const fs = require("fs");
require("../js/utils");
const Validator = require('jsonschema').Validator;

const validator = new Validator();
const helperFile = "entry.json";
const bestiaryFile = "bestiary/bestiary.json";
const spellsFile = "spells/spells.json";
validator.addSchema(require(`./schema/${helperFile}`), "/Entry");
validator.addSchema(require(`./schema/${bestiaryFile}`), "/Bestiary");
validator.addSchema(require(`./schema/${spellsFile}`), "/Spells");

async function main () {
	const TESTS_PASSED = 0;
	const TESTS_FAILED = 1;

	await require("./check-tags");
	await require("./check-images");
	await require("./check-pagenumbers");

	function loadJSON (file) {
		const data = fs.readFileSync(file, "utf8")
			.replace(/^\uFEFF/, ""); // strip BOM
		return JSON.parse(data);
	}

	// FIXME use something that doesn't attach object prototypes -- https://github.com/tdegrunt/jsonschema/issues/261
	// TODO modular argument system?
	if (process.argv[2] !== "noschema") {
		console.log(`##### Validating the JSON schemata #####`);
		// Loop through each non-helper schema and push all validation results.
		fs.readdirSync("./test/schema")
			.filter(file => file.endsWith(".json")) // ignore directories
			.forEach(file => {
				if (file !== helperFile) {
					console.log(`Testing data/${file}`.padEnd(50), `against schema/${file}`);
					const result = validator.validate(loadJSON(`./data/${file}`), require(`./schema/${file}`));
					checkHandleError(result);
				}
			});

		fs.readdirSync(`./test/schema`)
			.filter(category => !category.endsWith(".json")) // only directories
			.forEach(category => {
				console.log(`Testing category ${category}`);
				const schemas = fs.readdirSync(`./test/schema/${category}`);
				fs.readdirSync(`./data/${category}`).forEach(dataFile => {
					schemas.filter(schema => dataFile.startsWith(schema.split(".")[0])).forEach(schema => {
						console.log(`Testing data/${category}/${dataFile}`.padEnd(50), `against schema/${category}/${schema}`);
						const result = validator.validate(loadJSON(`./data/${category}/${dataFile}`), require(`./schema/${category}/${schema}`));
						checkHandleError(result);
					});
				});
			});

		console.log(`All schema tests passed.`);
	}

	process.exit(TESTS_PASSED);

	/**
	 * Fail-fast
	 * @param result a result to check
	 */
	function checkHandleError (result) {
		if (!result.valid) {
			console.error(JSON.stringify(result.errors, null, 2));
			console.warn(`Tests failed`);
			process.exit(TESTS_FAILED);
		}
	}
}

main()
	.then(() => console.log("Tests complete."))
	.catch(e => { throw e });
