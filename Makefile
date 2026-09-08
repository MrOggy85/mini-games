.PHONY: serve icons

serve:
	python3 -m http.server 8000

# Regenerate home screen PNGs from each icon.svg
icons:
	npm install --no-save --no-package-lock sharp
	node tools/render-icons.js
