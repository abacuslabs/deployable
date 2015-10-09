# deployable

Deployable helps teams deploy their projects easily. It helps you create Heroku-like application builds using [buildpacks](https://devcenter.heroku.com/articles/buildpacks) while giving you the ability to do [Deployinator](https://github.com/etsy/deployinator)-esque one-click & easy deploys.

## Setup

You'll need to create a [GitHub application key](https://github.com/settings/developers). Once you have this, you will then need to create a `.env` file on the root directory of the project.

```
URL=https://deployable.ngrok.com
GITHUB_CLIENT_KEY=
GITHUB_CLIENT_SECRET=
```

Then, make sure you have [Node.js](https://nodejs.org/en/) installed on your machine. Afterwards, you can run `npm install` which install all dependencies and build the application.

## License

MIT