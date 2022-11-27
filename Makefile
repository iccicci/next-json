all: parser.ts

build: parser.ts
	tsc -p tsconfig.cjs.json
	tsc -p tsconfig.es.json
	tsc -p tsconfig.types.json

deploy: build
	npm_config_registry=registry.npmjs.org npm publish

parser.ts: generate.ts next-json.pegjs
	ts-node generate.ts
