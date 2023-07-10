// @ts-check

import _data from '__gitmoji-data__'

/** @typedef { 'major' | 'minor' | 'patch' } Semver
/** @typedef {{ emoji: string; entity: string; code: string; description: string; name: string; semver: Semver | null }} Gitmoji */

/** @type {{ gitmojis: Gitmoji[] }} */
const data = _data

export function run() {
	const outputItems = {
		items: data.gitmojis.map((item) => ({
			title: item.description,
			subtitle: item.code,
			icon: {
				path: `./icons/${item.name}.svg`,
			},
			arg: item.code,
			mods: {
				shift: {
					valid: true,
					subtitle: 'Copy emoji to clipboard',
					arg: item.emoji,
				},
			},
		})),
	}
	return JSON.stringify(outputItems)
}
