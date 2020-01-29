import { h } from 'preact'
import renderToString from 'preact-render-to-string'

import { Template } from '../ui'

export function render(data: Record<EntityType, EntityProps['data']>) {
  return renderToString(<AreWeEdtrIoYet data={data} />)
}

export enum EntityType {
  applet = 'applet',
  article = 'article',
  course = 'course',
  coursePage = 'course-page',
  event = 'event',
  mathPuzzle = 'math-puzzle',
  textExercise = 'text-exercise',
  textExerciseGroup = 'text-exercise-group',
  video = 'video'
}

function AreWeEdtrIoYet({
  data
}: {
  data: Record<EntityType, EntityProps['data']>
}) {
  const types = Object.values(EntityType)

  return (
    <Template lang="en" title="Are we Edtr.io yet?">
      <table id="toc" class="table">
        <tbody>
          {types.map(type => {
            const progress = getProgress(data[type])
            const done = progress.current === progress.max

            return (
              <tr class={done ? 'success' : undefined}>
                <td>
                  <a href={`#${type}`}>{getTitle(type)}</a>
                </td>
                <td>
                  <EntityProgress type={type} data={data[type]} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {types.map(type => {
        return <Entity type={type} data={data[type]} />
      })}
    </Template>
  )
}

function Entity(props: EntityProps) {
  const { type, data } = props

  return (
    <div id={type} class="panel panel-default">
      <div class="panel-heading">
        <h3 class="panel-title">
          {getTitle(type)}{' '}
          <small>
            <a href="#toc">back to top</a>
          </small>
        </h3>
      </div>
      <div class="panel-body">
        <EntityProgress {...props} />
        <table class="table">
          <tbody>
            {data
              .sort((a, b) => (a.converted ? 1 : 0) - (b.converted ? 1 : 0))
              .map(entity => {
                const icon = entity.converted
                  ? 'fa-check-circle-o'
                  : 'fa-circle-o'
                const href = `https://de.serlo.org/${entity.id}`
                return (
                  <tr class={entity.converted ? 'success' : undefined}>
                    <td>
                      <i class={`fa ${icon}`} aria-hidden="true" />
                      <a href={href}>{href}</a>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EntityProgress({ data }: EntityProps) {
  const progress = getProgress(data)
  const className =
    progress.current === progress.max
      ? 'progress-bar progress-bar-success'
      : 'progress-bar'
  return (
    <div class="progress">
      <div
        class={className}
        role="progressbar"
        aria-valuenow={progress.current}
        aria-valuemin="0"
        aria-valuemax={progress.max}
        style={`width: ${progress.percent}`}
      >
        {progress.current} / {progress.max}
      </div>
    </div>
  )
}

function getProgress(data: EntityProps['data']) {
  const convertedEntities = data.filter(entity => entity.converted)
  const ratio = data.length === 0 ? 1 : convertedEntities.length / data.length
  return {
    max: data.length,
    current: convertedEntities.length,
    percent: `${ratio * 100}%`
  }
}

function getTitle(type: EntityType) {
  switch (type) {
    case EntityType.applet:
      return 'GeoGebra Applet'
    case EntityType.article:
      return 'Article'
    case EntityType.course:
      return 'Course'
    case EntityType.coursePage:
      return 'Course Page'
    case EntityType.event:
      return 'Event'
    case EntityType.mathPuzzle:
      return 'Math Puzzle'
    case EntityType.textExercise:
      return 'Text Exercise'
    case EntityType.textExerciseGroup:
      return 'Text Exercise Group'
    case EntityType.video:
      return 'Video'
  }
}

interface EntityProps {
  type: EntityType
  data: { id: string; converted: boolean }[]
}
