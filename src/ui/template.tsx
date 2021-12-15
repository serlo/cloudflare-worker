/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { h, ComponentChildren, Fragment } from 'preact'

import { Instance } from '../utils'

export function NotFound() {
  return (
    <Template title="Not Found" lang="en">
      <h1>Page not found</h1>
      <p>The page you have requested does not exist.</p>
    </Template>
  )
}

export function CenteredContent({ children }: { children: ComponentChildren }) {
  return <div className="call">{children}</div>
}

export function Template({
  children,
  lang,
  title,
}: {
  children: ComponentChildren
  lang: string
  title: string
}) {
  const favicon =
    'data:image/x-icon;base64,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PwDRgD4A2oI9AMJ5PwBRT0yxREpORU1NTQBNTU0ATU1NAP///wD///8A////AP///wD///8A////AFBOTQBQTk0AUE5NAFBOTQBQTk0AUE5NAFBOTQBQTk0AUE5NAEhLTQAzQ1AAjGVFAMh8PgC1dUAAtXVAALR1QAC0dUAAw3o/AM9/PQDVgTwA0H89WU9OTcgsQFEQOkZPADpGTwA6Rk8A////AP///wD///8A////AP///wD///8AUE5NAFBOTQBQTk0AUE5NAFBOTQBQTk0AUE5NAFBOTQBQTk0ASEtNADNDUACMZUUAyHw+ALV1QAC1dUAAtXVAALZ1QACzdEAAr3JBAL55P0OXakTwS0xNq4tlRQCHY0YAhmNGAIZjRgD///8A////AP///wD///8A////AP///wBQTk0AUE5NAFBOTQBQTk0AUE5NAFBOTQBQTk0AUE5NAFBOTQBIS00AM0NQAIxlRQDIfD4AtXVAALV1QAC1dUAAtXVAALV1QACzdEBB0YA8821ZScllVkrO4oY7XsZ8PgDHfD4Ax3w+AP///wD///8A////AP///wD///8A////AFBOTQBQTk0AUE5NAFBOTQBQTk0AUE5NAFBOTQBQTk0AUE5NAEhLTQAzQ1AAjGVFAMh8PgC1dUAAtXVAALV1QEe1dUCTtXVAv7d1QP/Eez7iT05NlJJnROTGez7/tXVAObV1QAC1dUAA////AP///wD///8A////AP///wD///8AUE5NAFBOTQBQTk0AUE5NAFBOTQBQTk0AUE5NAFBOTQBQTk0ASEtNADNDUACLZUUAyHw+ALV1QAC1dUAAtXVAvrV1QP+zdED/zX49/4ZjRrxPTk2kyn097LV1QP+1dUD/tXVAsLV1QBb///8A////AP///wD///8A////AP///wBQTk0AUE5NAFBOTQBQTk0AUE5NAFBOTQBQTk0AUE5NAFBOTQBIS00AM0NQAItlRQDIfD4AtXVAALV1QDS1dUDwtXVA/7Z2QP/Ofj3oSkxOpIpkRdDLfT3/s3RAt7V1QH+1dUC3tXVAN////wD///8A////AP///wD///8A////AEdKTgBHSk4AR0pOAEdKTgBHSk4ARkpOAE9NTQBTT00AVE9NAElLTQAgPFIAgmJGAMx+PQ61dUCetXVA8rV1QNCydED61IE8/3VdSLxbUkuyzX4997R1QP+1dUD5tXVAj7V1QAW1dUAA////AP///wD///8A////AP///wD///8AW1JMAFtSTABbUkwAW1JMAFxSTABdU0wARkpOADpFUAA0Q1AALkFRAFFOTACkbkIKwHk/f7V1QPq1dUD5sXNA+tGAPP+TaEXSQUhPnrx3P+/AeT71tHRA6rV1QP+1dUDVtXVAALV1QAD///8A////AP///wD///8A////AP///wC0dUAAtHVAALR1QAC0dUAAtXVAALd2QACcbEMAhWNGAFxTSwB7X0cgxns+zcB5P/yydEDCtXVAvrN0QOHSgDz/mWpE20JJTpCuckHTyHw9/7J0QPW1dUCwtXVA4LV1QEG1dUAAtXVAAP///wD///8A////AP///wD///8A////ALp3PwC6dz8Aunc/ALp3PwC6dz8AuXc/AMR7PgDJfT4CyH0+h8d8Pv+4dj//tHRA/7N0QP+5dz//0IA9/4xlRcFST02LrnJAzMp9Pf+xc0H/tXVA/7V1QP+1dUBGtXVAALV1QAC1dUAA////AP///wD///8A////AP///wD///8AtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAH7V1QN+1dUD/tXVA/7V1QP+xdED/xHs+/8d8PvRuWkmaWFJMerp3QN/IfD7/sXNA/7V1QP+1dUD/tXVAtrV1QAC1dUAAtXVAALV1QAD///8A////AP///wD///8A////AP///wC1dUAAtXVAALV1QAC1dUAAtXVAALV1QEK1dUD7tXVA/7V1QP+zdED/tnZA/9GAPP+pcUHWVlBMf3FbSJXHfD30wXk+/7J0QP+1dUD/tXVA/7V1QM61dUAAtXVAALV1QAC1dUAAtXVAAP///wD///8A////AP///wD///8A////ALV1QAC1dUAAtXVAALV1QAC1dUBctXVA/7V1QP+1dUD/sXRA/8F6Pv/IfD7wdl1IqlJPTISUaETD0H89/rh2QP+zdED/tXVA/7V1QP+1dUDKtXVACbV1QAC1dUAAtXVAALV1QAC1dUAA////AP///wD///8A////AP///wD///8AtXVAALV1QAC1dUAAtXVAS7V1QP+1dUD/tXVA/7F0QP/KfT3/uXdA51dQTIFhVEuSunc/7st+Pf+ydED/tXVA/7V1QP+1dUD/tXVAx7V1QAa1dUAAtXVAALV1QAC1dUAAtXVAALV1QAD///8A////AP///wD///8A////AP///wC1dUAAtXVAALV1QBu1dUDvtXVA/7V1QP+ydED/0H89/6dvQtlKTE5xh2NGrtKAPP69eD//snRA/7V1QP+1dUD/tXVA/7V1QKe1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAAP///wD///8A////AP///wD///8A////ALV1QAC1dUAAtXVAsbV1QP+1dUD/s3RA/9CAPf+NZkW+OEVPcqBsQ7/SgDz/tHRA/7R1QP+1dUD/tXVA/7V1QP+1dUBgtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAA////AP///wD///8A////AP///wD///8AtXVAALV1QEq1dUD/tXVA/7J0QP/Ofz3/kWdEskdLTmSwc0DQy309/7J0QP+1dUD/tXVA/7V1QP+1dUC/tXVAGrV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAD///8A////AP///wD///8A////AP///wC1dUAAtXVArLV1QP+ydED/yX0+/6BtQ8tKS01hu3c/0sl9Pf+ydED/tXVA/7V1QP+1dUD6tXVAW7V1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAAP///wD///8A////AP///wD///8A////ALV1QB61dUDttXVA/7p3P/+5dz/2XFNLdqhwQrjIfD3/sXRA/7V1QP+1dUD/tXVAkLV1QAm1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAA////AP///wD///8A////AP///wD///8AtXVAY7V1QP+zdED/zH49/3ZdSKCGY0aP0IA9/7F0QP+1dUD/tXVA1LV1QCW1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAD///8A////AP///wD///8A////AP///wC1dUCJtXVA/7x4P/+lbkLreF1IbsN7Pua0dUD/tXVA/7V1QIS1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAAP///wD///8A////AP///wD///8A////ALV1QIG0dUD/x3w+/4tkRZmXakSJxnw+/7R0QPe1dUA5tXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAA////AP///wD///8A////AP///wD///8AtXVARbV1QP+3dkD/iWRFerJ0QN21dUD/tXVAKrV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAD///8A////AP///wD///8A////AP///wC1dUALvHg/559sQvOJZEWBw3o+/7R1QDa1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAAP///wD///8A////AP///wD///8A////ALV1QADDej6jkGdF0ZNoRJ7Fez57tXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAA////AP///wD///8A////AP///wD///8AtXVAALp3Pz+qcUHArnJBdbh2QA+1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAD///8A////AP///wD///8A////AP///wC1dUAAs3RABbp3P0W6d0AWs3RAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAALV1QAC1dUAAtXVAAP///wD///8A////AP///z////8/////P////z////8////+P////H////g////AH///wAf//4AH//4AD//8AB//8AAf/8AAP/+AAH//AAD//gAA//wAAf/4AAf/+AAP//AAH//wAH//4AD//+AD///gD///4B///+A////gf///8P////D////x////'

  const googleAnalytics = `
    var disableStr='ga-disable-UA-20283862-3';if(document.cookie.indexOf(disableStr+'=true')>-1){window[disableStr]=true;}
    function gaOptout(){document.cookie=disableStr+'=true; expires=Thu, 31 Dec 2099 23:59:59 UTC; path=/';window[disableStr]=true;}
  `

  const css = `
    #header-nav {
      height: auto;
    }

    .content {
      padding: 60px;
    }

    .call {
      text-align: center;
      font-size: 18px;
  }`

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Serlo - {title}</title>
        <link href={favicon} rel="icon" type="image/x-icon" />
        <link
          href="https://packages.serlo.org/serlo-org-client@8/main.css"
          rel="stylesheet"
        />
        <style>{css}</style>
      </head>
      <body>
        <div className="wrap" style="margin-bottom: -200px;">
          <header id="header">
            <div className="container">
              <nav id="header-nav">
                <div id="mobile-nav-toggle">
                  <a className="main-headline-link" href="/">
                    <span className="serlo-logo">V</span>
                    <div className="serlo-brand">Serlo</div>
                  </a>
                  <span className="subject-title">{title}</span>
                </div>
              </nav>
            </div>
          </header>
          <div id="page" className="container has-sidebar clearfix">
            <section className="clearfix">
              <div className="content clearfix">
                <div className="r">
                  <div className="c24">{children}</div>
                </div>
              </div>
            </section>
          </div>
          <div id="horizon" />
          <div id="footer-push" style="height: 200px;" />
        </div>
        <footer id="footer" className="home-row">
          <div className="footer-wrapper col-lg-8 col-lg-push-1">
            {getFooter()}
          </div>
        </footer>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{ __html: googleAnalytics }}
        />
      </body>
    </html>
  )

  function getFooter() {
    switch (lang) {
      case Instance.De:
        return (
          <Fragment>
            <div className="logo-wrapper">
              <a href="/">
                <span className="serlo-logo">V</span>
                <div className="serlo-brand">Serlo</div>
              </a>{' '}
              Die freie Lernplattform
            </div>
            <nav>
              <div className="footer-title">Rechtlich</div>
              <ul className="nav nav-list">
                <li>
                  <a href="/terms">Nutzungsbedingungen und Urheberrecht</a>
                </li>
                <li>
                  <a href="/privacy">Datenschutz</a>
                </li>
                <li>
                  <a href="/consent">Einwilligungen widerrufen</a>
                </li>
                <li>
                  <a href="/imprint">Impressum</a>
                </li>
              </ul>
            </nav>
          </Fragment>
        )
      case Instance.En:
      default:
        return (
          <Fragment>
            <div className="logo-wrapper">
              <a href="/">
                <span className="serlo-logo">V</span>
                <div className="serlo-brand">Serlo</div>
              </a>{' '}
              The Open Learning Platform
            </div>
            <nav>
              <div className="footer-title">Legal Terms</div>
              <ul className="nav nav-list">
                <li>
                  <a href="/terms">Terms of Use</a>
                </li>
                <li>
                  <a href="/privacy">Privacy Policy</a>
                </li>
                <li>
                  <a href="/consent">Revoke consent</a>
                </li>
                <li>
                  <a href="/imprint">Imprint</a>
                </li>
              </ul>
            </nav>
          </Fragment>
        )
    }
  }
}
