import { gql } from 'apollo-server-cloudflare'

export enum Instance {
  De = 'de',
  En = 'en'
}

export const instanceTypeDefs = gql`
  enum Instance {
    de
    en
  }
`
