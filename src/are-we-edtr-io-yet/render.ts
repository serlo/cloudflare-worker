import { renderHtml, renderHtmlTemplate } from '../html-utils'

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

export function render(
  data: Record<EntityType, { id: string; converted: boolean }[]>
) {
  const types = Object.values(EntityType)
  return renderHtml({
    lang: 'en',
    title: 'Are we Edtr.io yet?',
    content: types
      .map(type => {
        return renderType(type, data[type])
      })
      .join('')
  })
}

function renderType(
  type: EntityType,
  entities: { id: string; converted: boolean }[]
) {
  const convertedEntities = entities.filter(entity => entity.converted)
  const legacyEntities = entities.filter(entity => !entity.converted)
  const ratio =
    entities.length === 0 ? 1 : convertedEntities.length / entities.length

  return renderHtmlTemplate(getTemplate(), {
    title: getTitle(type),
    progress: {
      max: entities.length,
      current: convertedEntities.length,
      percent: `${ratio * 100}%`
    }
  })

  function getTemplate() {
    return `
<div class="panel panel-default">
  <div class="panel-heading">
    <h3 class="panel-title">{{title}}</h3>
  </div>
  <div class="panel-body">
          <div class="progress">
  <div class="progress-bar" role="progressbar" aria-valuenow="{{progress.current}}" aria-valuemin="0" aria-valuemax="{{progress.max}}" style="width: {{progress.percent}};">
    {{progress.current}} / {{progress.max}}
  </div>
</div>
  </div>
    <table class="table">
    <tbody>
  ${entities
    .sort((a, b) => (a.converted ? 1 : 0) - (b.converted ? 1 : 0))
    .map(entity => {
      const className = entity.converted ? 'success' : ''
      const link = `https://de.serlo.org/${entity.id}`
      return `
      <tr class="${className}"><td>${
        entity.converted
          ? '<i class="fa fa-check-circle-o" aria-hidden="true"></i>'
          : '<i class="fa fa-circle-o" aria-hidden="true"></i>'
      }<a href="${link}">${link}</a> </td>
    </tbody>
</tr>
  `
    })
    .join('')}
</table>
</div>
`
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
