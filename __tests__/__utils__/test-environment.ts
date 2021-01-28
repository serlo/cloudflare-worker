/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
export enum TestEnvironment {
  Local = 'local',
  Staging = 'staging',
  Production = 'production',
}

export const domains: Record<TestEnvironment, string> = {
  [TestEnvironment.Local]: 'serlo.local',
  [TestEnvironment.Staging]: 'serlo-staging.dev',
  [TestEnvironment.Production]: 'serlo.org',
}

export function getTestEnvironment(): TestEnvironment {
  const environment = (process.env.TEST_ENVIRONMENT ?? '').toLowerCase()

  return isTestEnvironment(environment) ? environment : TestEnvironment.Local
}

function isTestEnvironment(env: string): env is TestEnvironment {
  return Object.values(TestEnvironment).includes(env as TestEnvironment)
}
