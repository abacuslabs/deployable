# 0.1.0

First initial release

* Ability to add and view GitHub repositories
* Authentication and repository restriction through the GitHub API
* Builds
  * Creates the necessary environments for Heroku buildpacks to run in
  * Automated builds per commit through GitHub webhooks
  * Support for Node.js application builds
* Deploys
  * Ability to deploy to staging and production environments using SSH strings
  * Locked production deploys until proper code signoff