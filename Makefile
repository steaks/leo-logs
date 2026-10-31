REGION := us-central1
PROJECT := $(shell gcloud config get-value project 2>/dev/null)
IMAGE := $(REGION)-docker.pkg.dev/$(PROJECT)/leo-logs/docs

.PHONY: deploy-docs
deploy-docs:
	gcloud builds submit --config=cloudbuild.docs.yaml
	gcloud run deploy leo-logs-docs \
		--image=$(IMAGE) \
		--region=$(REGION) \
		--port=8080 \
		--allow-unauthenticated
