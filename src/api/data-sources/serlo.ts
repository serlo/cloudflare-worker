import { RESTDataSource } from 'apollo-datasource-rest'

import { Instance } from '../schema/instance'

export class SerloDataSource extends RESTDataSource {
  public async getAlias(alias: { path: string; instance: Instance }) {
    return this.get(`/api/alias${alias.path}`, alias.instance)
  }

  public async getLicense(id: number) {
    return this.get(`/api/license/${id}`)
  }

  public async getUuid(id: number) {
    return this.get(`/api/uuid/${id}`)
  }

  protected async get(path: string, instance: Instance = Instance.De) {
    if (process.env.NODE_ENV === 'test') {
      return super.get(`http://localhost:9009/${path}`)
    }

    return super.get(
      `https://${instance}.${DOMAIN}/${path}`,
      undefined,
      ENABLE_BASIC_AUTH === 'true'
        ? {
            headers: {
              Authorization: 'Basic c2VybG90ZWFtOnNlcmxvdGVhbQ==',
            },
          }
        : undefined
    )
  }
}
