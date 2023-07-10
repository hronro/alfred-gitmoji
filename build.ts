import { exists } from "https://deno.land/std@0.193.0/fs/exists.ts"

import { rollup, type RollupBuild } from "npm:rollup"
import { minify } from "npm:uglify-js"

const MAGIC_GITMOJI_DATA_MODULE_NAME = "__gitmoji-data__"

type Semver = "major" | "minor" | "patch"
interface Gitmoji {
	emoji: string
	entity: string
	code: string
	description: string
	name: string
	semver: Semver | null
}
interface GitmojiData {
	gitmojis: Gitmoji[]
}

const gitmojiData: GitmojiData =
	await (await fetch("https://gitmoji.dev/api/gitmojis"))
		.json()

let bundle: RollupBuild

try {
	bundle = await rollup({
		input: "src/main.js",
		treeshake: { preset: "smallest" },
		strictDeprecations: true,
		plugins: [
			{
				name: "gitmojiData",
				resolveId(source) {
					if (source === MAGIC_GITMOJI_DATA_MODULE_NAME) {
						return source
					}
					return null
				},
				load(id) {
					if (id === MAGIC_GITMOJI_DATA_MODULE_NAME) {
						return `export default ${JSON.stringify(gitmojiData)}`
					}
					return null
				},
			},
		],
	})
} catch (error) {
	console.error(error)
	Deno.exit(1)
}

const { output: outputs } = await bundle.generate({
	generatedCode: {
		preset: "es2015",
	},
})

// Setup the output directory
if (await exists("./dist")) {
	await Deno.remove("./dist", { recursive: true })
}
Deno.mkdir("./dist")

if (outputs.length === 0) {
	throw new Error("No outputs from rollup")
}

const output = outputs[0]!

if (output.type !== "chunk") {
	throw new Error("Unexpected Rollup output type")
}
const script = minify(output.code, {
	compress: {
		toplevel: true,
	},
	mangle: {
		toplevel: true,
		reserved: ["run"],
	},
}).code.replace("export{run}", "")
const alfredPlistTemplate = await Deno.readTextFile("./info.plist.in")
await Deno.writeTextFile(
	`./dist/info.plist`,
	alfredPlistTemplate.replace("{{script}}", script),
)

// Download icons from Twemoji
await Deno.mkdir("./dist/icons")
await Promise.all(gitmojiData.gitmojis.map(async (item) => {
	const unicode = item.emoji.codePointAt(0)!.toString(16)
	const response = await fetch(
		`https://raw.githubusercontent.com/twitter/twemoji/v14.0.2/assets/svg/${unicode}.svg`,
	)
	if (response.status !== 200) {
		throw new Error(`Failed to download ${item.name} icon`)
	}
	await Deno.writeFile(`./dist/icons/${item.name}.svg`, response.body!)
}))

// Copy the workflow icon
Deno.copyFile('./icon.png', './dist/icon.png')
