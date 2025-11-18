SRC_DIR = .
BUILD_DIR = build
COMMON_DIR = $(SRC_DIR)/common
COMPONENTS_DIR = $(SRC_DIR)/components
PAGES_DIR = $(SRC_DIR)/pages
VENDOR_DIR = $(SRC_DIR)/vendor
LOCALES_DIR = $(SRC_DIR)/_locales
IMAGES_DIR = $(SRC_DIR)/images
STYLES_DIR = $(SRC_DIR)/styles
CONFIG_DIR = $(SRC_DIR)/config

TERSER = terser
HTML_MINIFIER = html-minifier-terser
CSS_MINIFIER = cleancss
ESLINT = eslint

TERSER_AVAILABLE := $(shell command -v $(TERSER) 2> /dev/null)
HTML_MINIFIER_AVAILABLE := $(shell command -v $(HTML_MINIFIER) 2> /dev/null)
CSS_MINIFIER_AVAILABLE := $(shell command -v $(CSS_MINIFIER) 2> /dev/null)
ESLINT_AVAILABLE := $(shell command -v $(ESLINT) 2> /dev/null)

JS_ROOT = $(wildcard $(SRC_DIR)/*.js)
JS_COMMON = $(wildcard $(COMMON_DIR)/*.js)
JS_COMPONENTS = $(wildcard $(COMPONENTS_DIR)/*.js)
JS_PAGES = $(wildcard $(PAGES_DIR)/*.js)
JS_ALL = $(JS_ROOT) $(JS_COMMON) $(JS_COMPONENTS) $(JS_PAGES)

HTML_FILES = $(wildcard $(PAGES_DIR)/*.html)

.PHONY: all build clean check-tools install-tools lint lint-fix

all: build

install-tools:
	@echo "Installing required build tools..."
	@npm install -g terser
	@npm install -g html-minifier-terser
	@npm install -g clean-css-cli
	@npm install -g eslint
	@echo "Installation complete!"

clean:
	@echo "Cleaning build directory..."
	@rm -rf $(BUILD_DIR)

check-tools:
	@echo "Checking for required build tools..."
ifndef TERSER_AVAILABLE
	@echo "Terser not found. Install with: npm install -g terser"
	@exit 1
else
	@echo "Terser found at $(TERSER_AVAILABLE)"
endif
ifndef HTML_MINIFIER_AVAILABLE
	@echo "Html-minifier-terser not found. Install with: npm install -g html-minifier-terser"
	@exit 1
else
	@echo "Html-minifier-terser found at $(HTML_MINIFIER_AVAILABLE)"
endif
ifndef CSS_MINIFIER_AVAILABLE
	@echo "Clean-css not found. Install with: npm install -g clean-css-cli"
	@exit 1
else
	@echo "Clean-css found at $(CSS_MINIFIER_AVAILABLE)"
endif
ifndef ESLINT_AVAILABLE
	@echo "ESLint not found. Install with: npm install -g eslint"
	@exit 1
else
	@echo "ESLint found at $(ESLINT_AVAILABLE)"
endif
	@echo "All required tools are installed!"

lint:
	@echo "Running ESLint..."
	@$(ESLINT) $(SRC_DIR)

lint-fix:
	@echo "Running ESLint with --fix..."
	@$(ESLINT) $(SRC_DIR) --fix

build: clean check-tools
	@echo "Building the ONLYOFFICE Thunderbird plugin..."
	
	@echo "Running ESLint..."
	@$(ESLINT) $(SRC_DIR)
	
	@mkdir -p $(BUILD_DIR)
	@echo "Copying source files..."
	@cp -r $(COMMON_DIR) $(COMPONENTS_DIR) $(PAGES_DIR) $(VENDOR_DIR) $(LOCALES_DIR) $(IMAGES_DIR) $(STYLES_DIR) $(CONFIG_DIR) $(BUILD_DIR)/
	@cp manifest.json $(BUILD_DIR)/
	@cp $(SRC_DIR)/*.js $(BUILD_DIR)/
	
	@echo "Minifying JavaScript files..."
	@find $(BUILD_DIR) -name "*.js" -type f -exec $(TERSER) -o {} {} \;
	
	@echo "Minifying CSS files..."
	@find $(BUILD_DIR) -name "*.css" -type f -exec $(CSS_MINIFIER) -o {} {} \;
	
	@echo "Build complete! Output in $(BUILD_DIR)/"
