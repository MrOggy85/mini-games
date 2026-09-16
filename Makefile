.PHONY: serve icons vendor verify

THREE_VERSION = 0.186.0
# Pinned so `make vendor` is reproducible. Only used at vendor time; nothing
# esbuild produces depends on it being the latest.
ESBUILD_VERSION = 0.28.2

serve:
	python3 -m http.server 8000

# Prove every Unblock Me level is solvable and that its par is the true optimum.
# Runs the game's own solver, sliced out of its HTML — see the tool's header.
verify:
	node tools/verify-levels.mjs

# Regenerate home screen PNGs from each icon.svg
icons:
	npm install --no-save --no-package-lock sharp
	node tools/render-icons.js

# Refresh the checked-in three.js build in vendor/.
# three stopped publishing minified builds in r186, so we minify them ourselves —
# see tools/vendor-three.mjs for why that is a node script and not two `cp`s.
# Read the migration guide between the old and new THREE_VERSION first; the URL
# is in CLAUDE.md under "Where to look things up".
vendor:
	npm install --no-save --no-package-lock three@$(THREE_VERSION) esbuild@$(ESBUILD_VERSION)
	node tools/vendor-three.mjs
