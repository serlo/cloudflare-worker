// @ts-ignore
global['addEventListener'] = () => {}

import createApp from 'express'

const app = createApp()

app.get('/are-we-edtr-io-yet', async function(req, res) {
  const { data } = await import('../__fixtures__/are-we-edtr-io-yet')
  const { render } = await import('../src/are-we-edtr-io-yet/render')
  res.send(render(data))
})

app.get('/maintenance', async function(req, res) {
  const { render } = await import('../src/maintenance/render')
  res.send(render({ lang: 'de' }))
})

app.listen(4000, function() {
  console.log('Example app listening on port 4000!')
})
