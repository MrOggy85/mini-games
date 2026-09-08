.PHONY: serve icons vendor

THREE_VERSION = 0.185.1

serve:
	python3 -m http.server 8000

# Regenerate home screen PNGs from each icon.svg
icons:
	npm install --no-save --no-package-lock sharp
	node tools/render-icons.js

# Refresh the checked-in three.js build in vendor/
vendor:
	npm install --no-save --no-package-lock three@$(THREE_VERSION)
	cp node_modules/three/build/three.module.min.js vendor/three.module.min.js
	cp node_modules/three/build/three.core.min.js vendor/three.core.min.js
	cp node_modules/three/LICENSE vendor/three.LICENSE
