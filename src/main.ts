import * as core from '@actions/core'
import * as github from '@actions/github'
import { exec } from '@actions/exec'
import { execSync } from 'child_process'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const dbfile = 'github-archive.db'
const events = [
  'issues',
  'issue_comment',
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
]
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
  const branchExists = await exec('git', [
    'fetch',
    'origin',
    branch,
    '--depth',
    '1',
  ])

  if (branchExists !== 0) {
    core.info(`No ${branch} branch exists, creating...`)
    await exec('git', ['checkout', '--orphan', branch])
    await exec('git', ['rm', '-rf', '.'])
    await exec('git', [
      'commit',
      '--allow-empty',
      '-m',
      `Creating ${branch} branch`,
    ])
  } else {
    core.info(`Checking out ${branch}`)
    await exec('git', ['checkout', '-t', `origin/${branch}`])
  }

  // open the database
  const db = await open({
    filename: dbfile,
    driver: sqlite3.Database,
  })

  // create tables if they don't exist
  await db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    kind TEXT NOT NULL,
    event TEXT NOT NULL
  );`)
  core.endGroup()

  core.startGroup('Capture event')
  for await (const e of events) {
    core.debug(`Checking for "${e}" event...`)
    if (github.context.eventName !== e) {
      // not this event
      continue
    }
    await db.run('INSERT INTO events (kind, event) values (:e, :payload)', {
      ':e': e,
      ':payload': JSON.stringify(github.context.payload),
    })
    core.info(`Captured ${e} event`)
  }
  core.endGroup()

  core.startGroup('Commit and close db')
  await db.close()
  await exec('git', ['add', dbfile])
  await exec('git', ['commit', '-m', 'Adding data to repo'])
  await exec('git', ['push', 'origin', branch])
  core.endGroup()
}

run().catch(error => {
  core.setFailed('Workflow failed! ' + error.message)
})
