Serlo Cloudflare Worker
=======================

This repository contains the source code for the cloudflare worker of Serlo ([https://serlo.org/](https://serlo.org)).

Static pages
------------

Our cloudflare worker also serves some static pages (mostly our legal documents like the imprint or our privacy statement).
The legal documents and other static pages are stored in the repository [https://github.com/serlo/serlo.org-legal](https://github.com/serlo/serlo.org-legal).
Which version is shown can be configured in the file [`src/static-pages/config.ts`](./src/static-pages/config.ts).
There the url is specified for each static page type and each language version under which the content of the static page can be accessed.
For revised static pages a list of revisions is specified which is ordered in a way that the current revision is the first one.

The content can also be formated in the Markdown format.
In this case the url / file must end with the extension `.md`.
Without this file extension it is assumed that the returned file contains the page's body in HTML format.

The content of the static pages are automatically sanatized (e.g. potentially malicious JavaScript content is automatically removed).
In case you need a link which deactivates Google Analytics use the string `__JS_GOOGLE_ANALYTICS_DEACTIVATE__` as the href attribute:

```
<a href="__JS_GOOGLE_ANALYTICS_DEACTIVATE__">Click here to deactivate Google Analytics</a>
```
