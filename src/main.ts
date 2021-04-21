import * as core from '@actions/core'
import * as github from '@actions/github'
import { exec } from '@actions/exec'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { nanoid } from 'nanoid'

const dbfile = 'github-archive.sqlite'
const events = [
  'issues',
  'issue_comment',
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
]
async function run(): Promise<void> {
  const now = new Date().toISOString()
  const id = nanoid()

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
  core.endGroup()

  const eventName = github.context.eventName
  if (!events.includes(eventName)) {
    throw new Error(`Unsupported event type: ${eventName}`)
  }

  // Actions can be triggered in parallel
  // As a result, several invocations of this code might be
  // executing right now.
  // We could figure out how to merge sqlite databases; there
  // is even some prior art in https://github.com/cannadayr/git-sqlite
  // The simple approach of "if our push is refused, pull and try again"
  // is probably going to be sufficient.
  while (true) {
    // open the database
    const db = await open({
      filename: dbfile,
      driver: sqlite3.Database,
    })

    // create tables if they don't exist
    await db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    kind TEXT NOT NULL,
    event TEXT NOT NULL
  );`)

    await db.run(
      'INSERT INTO events (id, timestamp, kind, event) values (:id, :timestamp, :e, :payload)',
      {
        ':id': id,
        ':timestamp': now,
        ':e': eventName,
        ':payload': JSON.stringify(github.context.payload),
      }
    )
    await db.close()
    await exec('git', ['add', dbfile])
    await exec('git', [
      'commit',
      '-m',
      `Capturing event ${eventName} (id: ${id})`,
    ])
    const code = await exec('git', ['push'])
    if (code === 0) {
      // success! We're finished.
      core.info('Success!')
      break
    } else {
      core.info('Retrying because of conflicts...')
      await exec('git', ['reset', '--hard', 'HEAD'])
      await exec('git', ['pull'])
    }
  }
}

run().catch(error => {
  core.setFailed('Workflow failed! ' + error.message)
})
