import { UnrevisedPageView, RevisedPageView } from '../src/static-pages'

export default {
  title: 'static-pages'
}

export function ExampleUnrevisedPage() {
  return UnrevisedPageView({
    lang: 'en',
    title: 'Imprint',
    content: '<h1>Imprint</h1><p>Hello World. This is an imprint.</p>'
  })
}

export function ExampleRevisedPage() {
  return RevisedPageView({
    lang: 'en',
    revision: new Date(2020, 0, 10),
    title: 'Privacy',
    content: `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam
                varius nisl in eros finibus commodo. Quisque fringilla nulla
                varius, porttitor diam vitae, maximus nibh. Etiam ornare
                faucibus ante, eu rutrum mauris.</p>
              <h2>Term 1</h2>
              <p>Sed sed nibh facilisis massa gravida consequat et in ex. Sed ac
                molestie ante. Vestibulum eu finibus metus. Morbi posuere, mi ve
                semper consequat, metus nibh tincidunt dui, at congue tellus nun
                sit amet felis. Mauris sodales euismod turpis sit amet tristi
                que.</p>`
  })
}
