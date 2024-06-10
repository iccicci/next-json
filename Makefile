all: parser.ts

build: parser.ts
	tsc -p tsconfig.cjs.json
	echo '{"sideEffects":false,"type":"commonjs"}' > dist/cjs/package.json
	tsc -p tsconfig.esm.json
	sed -i 's|from "\.\/parser"|from "./parser.js"|' dist/esm/index.js
	tsc -p tsconfig.types.json

deploy: build
	npm_config_registry="https://registry.npmjs.org/" npm publish

parser.ts: generate.ts next-json.pegjs
	tsx generate.ts
