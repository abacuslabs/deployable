# deployable

Deployable helps teams deploy their projects easily. It helps you create Heroku-like application
builds using [buildpacks](https://devcenter.heroku.com/articles/buildpacks) while giving you the
ability to do [Deployinator](https://github.com/etsy/deployinator)-esque one-click & easy deploys.

Deployable has a couple of opinions about deploys:
* Repositories must have different staging and production environments
* Builds are done automatically from GitHub webhooks
* Staging environments _should_ be automatically deployed on successful builds
* Heroku Cedar-14 environments; your architecture should be language & application independent
* Confirmation from each author in order to deploy to production

## Setup

* You'll need to create a [GitHub application key](https://github.com/settings/developers).
Once you have this, you will then need to create a `config/config.json` file on the root
directory of the project. See [config/config.json](config/config.json).

* You'll need to create an SSH key with `ssh-keygen` for the user that is running Deployable.
The public key will need to be added to `.ssh/authorized_keys` on each application server.

* Deployable looks for `deploy.sh` in your repository and uses it to restart your proccesses.
It is good for this script to handle all states (stopped, running, etc).

* Afterwards, you'll need to setup your repositories and deployment environments in
`config/repos.json`. See [config/repos.json.example](config/repos.json.example)
for possible options.

* Then, make sure you have [Nodejs](https://nodejs.org/en/) installed on your machine. Afterwards,
you can run `npm install` which install all dependencies and build the application.

* Run [deploy.sh](deploy.sh) to start Deployable. It will run on port 3000 by default. You can also run this script in a `@reboot` cronjob or when you `git pull`.

## License

MIT
