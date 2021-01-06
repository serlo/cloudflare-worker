/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { h } from 'preact'

import { Template, CenteredContent } from '../ui'

export enum EntityType {
  applet = 'applet',
  article = 'article',
  course = 'course',
  coursePage = 'course-page',
  event = 'event',
  mathPuzzle = 'math-puzzle',
  textExercise = 'text-exercise',
  textExerciseGroup = 'text-exercise-group',
  video = 'video',
}

export interface AreWeEdtrIoYetProps {
  data: Record<EntityType, EntityProps['data']>
}

export function AreWeEdtrIoYet({ data }: AreWeEdtrIoYetProps) {
  const types = Object.values(EntityType)

  return (
    <Template lang="en" title="Are we Edtr.io yet?">
      <CenteredContent>
        <table id="toc" className="table">
          <tbody>
            {types.map((type) => {
              const progress = getProgress(data[type])
              const done = progress.current === progress.max

              return (
                <tr key={type} className={done ? 'success' : undefined}>
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
        {types.map((type) => {
          return <Entity key={type} type={type} data={data[type]} />
        })}
      </CenteredContent>
    </Template>
  )
}

function Entity(props: EntityProps) {
  const { type, data } = props

  return (
    <div id={type} className="panel panel-default">
      <div className="panel-heading">
        <h3 className="panel-title">
          {getTitle(type)}{' '}
          <small>
            <a href="#toc">back to top</a>
          </small>
        </h3>
      </div>
      <div className="panel-body">
        <EntityProgress {...props} />
        <table className="table">
          <tbody>
            {data
              .sort((a, b) => (a.converted ? 1 : 0) - (b.converted ? 1 : 0))
              .map((entity) => {
                const icon = entity.converted
                  ? 'fa-check-circle-o'
                  : 'fa-circle-o'
                const href = `https://de.serlo.org/${entity.id}`
                return (
                  <tr
                    key={entity.id}
                    className={entity.converted ? 'success' : undefined}
                  >
                    <td>
                      <i className={`fa ${icon}`} aria-hidden="true" />
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
    <div className="progress">
      <div
        className={className}
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
  const convertedEntities = data.filter((entity) => entity.converted)
  const ratio = data.length === 0 ? 1 : convertedEntities.length / data.length
  return {
    max: data.length,
    current: convertedEntities.length,
    percent: `${ratio * 100}%`,
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
