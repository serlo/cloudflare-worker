import { DateTime } from 'luxon'
import { h } from 'preact'

import { NotFound } from '../src/ui/'
import { Maintenance } from '../src/maintenance/template'

export default {
  component: Maintenance,
  title: 'maintenance'
}

export function De() {
  return <Maintenance lang="de" />
}
De.story = {
  name: 'de (w/o end date)'
}

export function DeEndDate() {
  const end = DateTime.local().plus({ hour: 1 })
  return <Maintenance lang="de" end={end} />
}
DeEndDate.story = {
  name: 'de (w/ end date)'
}

export function En() {
  return <Maintenance lang="en" />
}
En.story = {
  name: 'en (w/o end date)'
}

export function EnEndDate() {
  const end = DateTime.local().plus({ hour: 1 })
  return <Maintenance lang="de" end={end} />
}
EnEndDate.story = {
  name: 'en (w/ end date)'
}

export function PageNotFound() {
  return NotFound()
}
