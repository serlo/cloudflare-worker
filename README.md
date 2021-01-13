# Serlo Cloudflare Worker

This repository contains the source code for the cloudflare worker of Serlo ([https://serlo.org/](https://serlo.org)).

## Testing

### Running tests

You can run tests with `yarn test`. We use [jest](https://jestjs.io/) and thus all [jest command line options](https://jestjs.io/docs/en/cli) can be used. It is also possible to run tests against other environments:

- `yarn test:dev` – Test against `serlo-development.dev`
- `yarn test:staging` – Test against `serlo-staging.dev`
- `yarn test:production` – Test against `serlo.org`

### Write tests

At [`__test__/__utils__`](./__tests__/__utils__) there are utility functions for writing tests:

- [`fetch-helper.ts`](./__tests__/__utils__/fetch-helper.ts):
  - `fetchSerlo()` - Fetch against the current testing environment. Use this function whenever possible. By setting `{ environment: TestEnvironment.Locally }` you can always test against the local environment.
- [`epxect-helper.ts`](./__tests__/__utils__/expect-helper.ts): Various assertation helper you can use.

## Static pages

Our cloudflare worker also serves some static pages (mostly our legal documents like the imprint or our privacy statement).
The legal documents and other static pages are stored in the repository [https://github.com/serlo/serlo.org-legal](https://github.com/serlo/serlo.org-legal).
Which version is shown can be configured in the file [`src/static-pages/config.ts`](./src/static-pages/config.ts).

There the url is specified for each static page type and each language version under which the content of the static page can be accessed.
For revised static pages a list of revisions is specified which is ordered in a way that the current revision is the first one.

The content can also be formated in the Markdown format.
In this case the url / file must end with the extension `.md`.
Without this file extension it is assumed that the returned file contains the page's body in HTML format.

The content of the static pages are automatically sanatized (e.g. potentially malicious JavaScript content is automatically removed).
In case you need a link which deactivates Google Analytics use the string `JS-GOOGLE-ANALYTICS-DEACTIVATE` as the `href` attribute:

```html
<a href="JS-GOOGLE-ANALYTICS-DEACTIVATE">
  Click here to deactivate Google Analytics
</a>
```

To include an iframe where the user can opt out from Matomo use the string `MATOMO-OPT-OUT-FORM`:

```markdown
Use the following form to opt out from Matomo:

MATOMO-OPT-OUT-FORM
```

## Frontend Proxy

The cloudflare worker also provides an A-B-testing for the new frontend.
The following variables define the behavior:

- `FRONTEND_ALLOWED_TYPES`: List of resource types given by the Serlo API which can be redirected to the new frontend.
- `FRONTEND_DOMAIN`: The domain of the new frontend.
- `FRONTEND_PROBABILITY`: The percentage of user which shall be redirected to the new frontend.

With the cookie `frontendDomain` you can override the variable of `FRONTEND_DOMAIN`.

## Preview Images

Via `embed.serlo.org/thumbnail?url=${videoUrl|appletUrl}` you can request thumbnail images for supported providers (YouTube, Vimeo, Wikimedia Commons and Geogebra).
