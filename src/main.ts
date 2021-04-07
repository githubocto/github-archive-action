import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { execSync } from 'child_process'

async function run(): Promise<void> {
  core.info(
    '[INFO] Usage https://github.com/githubocto/github-archive-action#readme'
  )
  core.startGroup('Setup')

  // Configure git user/email
  const username = 'github-archive-action'
  await exec('git', ['config', 'user.name', username])
  await exec('git', [
    'config',
    'user.email',
    `${username}@users.noreply.github.com`,
  ])
  core.debug('Configured git user.name/user.email')

  // Create the oprhan github-meta branch if it doesn't exist
  const branch = core.getInput('branch')
  const branchExists =
    execSync(`git branch --list ${branch}`).toString().trim() !== ''

  if (!branchExists) {
    core.info(`No ${branch} branch exists, creating...`)
  }

  core.endGroup()
}

run().catch(error => {
  core.setFailed('Workflow failed! ' + error.message)
})
