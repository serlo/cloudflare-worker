import { UnrevisedPageView, RevisedPageView } from '../src/static-pages'

export default {
  title: 'static-pages'
}

const content = `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam
varius nisl in eros finibus commodo. Quisque fringilla nulla varius, porttitor
diam vitae, maximus nibh. Etiam ornar faucibus ante, eu rutrum mauris.</p>
<h2>Term 1</h2>
<p>Sed sed nibh facilisis massa gravida consequat et in ex. Sed ac molestie ant.
Vestibulum eu finibus metus. Morbi posuere, mi veq semper consequat, metus nibh
tincidunt dui, at congue tellus nun sit amet felis. Mauris sodales euismod
turpis sit amet tristi que.</p>`

export function ExampleUnrevisedPage() {
  return UnrevisedPageView({
    lang: 'en',
    title: 'Imprint',
    content
  })
}

export function ExampleRevisedPage() {
  return RevisedPageView({
    lang: 'en',
    revision: new Date(2020, 0, 10),
    title: 'Privacy',
    content
  })
}
