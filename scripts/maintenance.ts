import { DateTime } from 'luxon'

exec()

/* eslint-disable no-console */
function exec() {
  if (process.argv.length <= 2) {
    console.error('Expecting date')
    process.exit(1)
  }

  const date = process.argv[2]
  console.log(parseDate(date).toISO())

  function parseDate(raw: string): DateTime {
    const now = DateTime.local()
    const match = /(\d\d):(\d\d)/.exec(raw)
    if (!match) {
      console.error(`Couldn't parse ${raw}`)
      process.exit(1)
    }
    const hour = parseInt(match[1], 10)
    const minute = parseInt(match[2], 10)
    return now.set({
      hour: hour,
      minute: minute,
      second: 0,
      millisecond: 0,
    })
  }
}
/* eslint-enable no-console */
