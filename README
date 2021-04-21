# Archive your GitHub data

This action archives GitHub-specific data into your repository.

GitHub has data that is not represented in git — like Issues and PRs. The purpose of this action is to capture that data in a portable, usable fashion.

### How does it work?

This action is triggered whenever GitHub data changes — for example, when issues are created or edited. It **does not** capture data that is already represented in your git repo, like commits.

This action is triggered whenever changes are made to GitHub data. See below for a list of events which trigger this action.

The event payload JSON is written into a SQLite database that is stored on an orphan branch called `github-meta`. Because these commits are made to an orphan branch, they won't get in the way of your day-to-day usage of git.

A clone of the repository will include the `github-meta` branch, making it easy to build tooling that uses that data.

## Setup

Clone your repo, and then create/push the orphan branch:

```bash
# in your repo:

# create the orphan branch
$ git checkout --orphan github-meta

# Remove all your repo content from the orphan branch.
# Don't worry — this only affects the orphan branches. Your content is safe!
$ git rm -rf .
$ git commit --allow-empty -m "Creating github-meta branch"

# and push it up to github
$ git push origin github-meta
```

Next, setup the action! Copy the following into `.github/workflows/archive.yaml`:

```yaml
name: GitHub Archive

on:
  create:
  delete:
  push:
  fork:
  gollum:
  issues:
  issue_comment:
  label:
  milestone:
  page_build:
  project:
  project_card:
  project_column:
  public:
  pull_request:
  pull_request_review:
  pull_request_review_comment:
  registry_package:
  release:
  status:
  watch:

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repo
        uses: actions/checkout@v2
        with:
          ref: 'github-meta'
      - name: Archive event
        uses: githubocto/github-archive-action@v1
```

This workflow definition is triggered for almost all of the [webhook event types that GitHub supports](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#webhook-events). Notably, `workflow_run` is excluded as it would capture runs of this archiving action.

If you don't care about a given kind of event, you can remove that from the list of triggers in the `on:` block of your workflow file.

## How is the data serialized?

The data is written to a [SQLite](https://www.sqlite.org/) database named `github-archive.sqlite` in the `github-meta` branch. It contains one table, `events`, with the following schema:

```sql
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    kind TEXT NOT NULL,
    event TEXT NOT NULL
);
```

| Column    | Description                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id        | A globally-unique ID for the captured event record.                                                                                                                                              |
| timestamp | An timestamp indicating when the event was captured, in [simplified extended ISO-8601 format](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString) |
| kind      | The name of the [webhook event type](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#webhook-events) which triggered the action, like `issues` or `pull_request`      |
| event     | The JSON payload data for the event                                                                                                                                                              |

See the [webhook events documentation](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#webhook-events) to find links to example payloads for each event.

# License

MIT
