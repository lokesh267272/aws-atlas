import { describe, expect, it } from 'vitest'
import { emptyConfig, menuReachable, missingParts, solution, transition } from './launchModel'

describe('launch builder model', () => {
  it('lists every unchosen part', () => {
    expect(missingParts(emptyConfig)).toEqual(['ami', 'instanceType', 'keyPair', 'securityGroup', 'storage'])
  })

  it('accepts "none" as a key pair choice', () => {
    expect(missingParts({ ...solution, keyPair: 'none' })).toEqual([])
  })

  it('lists only the parts still missing', () => {
    expect(missingParts({ ...emptyConfig, ami: 'amazon-linux', storageGiB: 8 })).toEqual(['instanceType', 'keyPair', 'securityGroup'])
  })

  it('launch is ignored while parts are missing or already launched', () => {
    expect(transition('not-launched', 'launch', emptyConfig)).toBe('not-launched')
    expect(transition('pending', 'launch', solution)).toBe('pending')
    expect(transition('not-launched', 'launch', solution)).toBe('pending')
    expect(transition('pending', 'boot-complete', solution)).toBe('running')
  })

  it('boot-complete only finishes a pending launch', () => {
    expect(transition('not-launched', 'boot-complete', solution)).toBe('not-launched')
    expect(transition('running', 'boot-complete', solution)).toBe('running')
    expect(transition('running', 'launch', solution)).toBe('running')
  })

  it('menu is reachable only when running with web traffic allowed', () => {
    expect(menuReachable(solution, 'pending')).toBe(false)
    expect(menuReachable({ ...solution, securityGroup: { web: false, sshFromAnywhere: false } }, 'running')).toBe(false)
    expect(menuReachable(solution, 'running')).toBe(true)
  })

  it('SSH alone does not let customers see the menu', () => {
    expect(menuReachable({ ...solution, securityGroup: { web: false, sshFromAnywhere: true } }, 'running')).toBe(false)
  })

  it('works without a key pair: the key only matters for logging in', () => {
    expect(menuReachable({ ...solution, keyPair: 'none' }, 'running')).toBe(true)
  })

  it('the Show me solution launches and gets the menu online', () => {
    expect(missingParts(solution)).toEqual([])
    const booted = transition(transition('not-launched', 'launch', solution), 'boot-complete', solution)
    expect(booted).toBe('running')
    expect(menuReachable(solution, booted)).toBe(true)
  })
})
