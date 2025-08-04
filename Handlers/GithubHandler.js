// handlers/githubHandler.js
const axios = require('axios');

// ClickUp API configuration
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';

// ClickUp list IDs
const CLICKUP_LISTS = {
  DEV_BACKLOG: process.env.CLICKUP_DEV_BACKLOG_LIST_ID,
  CODE_REVIEWS: process.env.CLICKUP_CODE_REVIEWS_LIST_ID,
  TODO: process.env.CLICKUP_TODO_LIST_ID
};

/**
 * Process GitHub webhook events
 * @param {Object} data - The webhook payload from GitHub
 * @param {String} eventType - The GitHub event type from the headers
 */
async function processGithubEvent(data, eventType) {
  console.log(`Processing GitHub ${eventType} event:`, JSON.stringify(data, null, 2));
  
  try {
    // Process different event types
    switch(eventType) {
      case 'push':
        await handlePushEvent(data);
        break;
      case 'pull_request':
        await handlePullRequestEvent(data);
        break;
      case 'issues':
        await handleIssuesEvent(data);
        break;
      default:
        console.log(`Event type ${eventType} not configured for processing`);
    }
    
    // Log the event to MongoDB (placeholder for future implementation)
    await logEventToMongoDB(data, eventType);
    
    return {
      status: 'success',
      message: `GitHub ${eventType} event processed successfully`
    };
  } catch (error) {
    console.error(`Error processing GitHub event:`, error);
    return {
      status: 'error',
      message: `Error processing GitHub event: ${error.message}`
    };
  }
}

/**
 * Handle GitHub push events (commits)
 * @param {Object} data - The push event payload
 */
async function handlePushEvent(data) {
  const { repository, commits, ref } = data;
  const branch = ref.replace('refs/heads/', '');
  
  console.log(`Push to ${repository.full_name} on branch ${branch} with ${commits.length} commits`);
  
  // Check for TODO comments in commits
  for (const commit of commits) {
    if (commit.message.toLowerCase().includes('todo')) {
      await createClickUpTask({
        name: `TODO from commit: ${commit.message.split('\n')[0]}`,
        description: `
# TODO from GitHub Commit

**Repository:** ${repository.full_name}
**Branch:** ${branch}
**Commit:** ${commit.id}
**Author:** ${commit.author.name}
**Message:**
\`\`\`
${commit.message}
\`\`\`

**Changes:**
- Added: ${commit.added.length} files
- Modified: ${commit.modified.length} files
- Removed: ${commit.removed.length} files

**Commit URL:** ${commit.url}
        `,
        listId: CLICKUP_LISTS.TODO,
        tags: ['github', 'todo', 'commit']
      });
    }
  }
}

/**
 * Handle GitHub pull request events
 * @param {Object} data - The pull request event payload
 */
async function handlePullRequestEvent(data) {
  const { action, pull_request, repository } = data;
  
  // Only process new PRs or when PRs are reopened
  if (action !== 'opened' && action !== 'reopened') {
    return;
  }
  
  // Only track PRs to main branch
  if (pull_request.base.ref !== 'main' && pull_request.base.ref !== 'master') {
    console.log(`Skipping PR to ${pull_request.base.ref} branch (only tracking main/master)`);
    return;
  }
  
  console.log(`New PR #${pull_request.number} in ${repository.full_name}: ${pull_request.title}`);
  
  await createClickUpTask({
    name: `Review PR #${pull_request.number}: ${pull_request.title}`,
    description: `
# Pull Request Review

**Repository:** ${repository.full_name}
**PR Number:** #${pull_request.number}
**Title:** ${pull_request.title}
**Author:** ${pull_request.user.login}

**Description:**
${pull_request.body || 'No description provided'}

**Changes:**
- ${pull_request.changed_files} files changed
- ${pull_request.additions} additions
- ${pull_request.deletions} deletions

**PR URL:** ${pull_request.html_url}
    `,
    listId: CLICKUP_LISTS.CODE_REVIEWS,
    tags: ['github', 'pull-request', repository.name]
  });
}

/**
 * Handle GitHub issues events
 * @param {Object} data - The issues event payload
 */
async function handleIssuesEvent(data) {
  const { action, issue, repository } = data;
  
  // Only process new issues or when issues are reopened
  if (action !== 'opened' && action !== 'reopened') {
    return;
  }
  
  // Check if issue has the 'stack' label
  const hasStackLabel = issue.labels.some(label => 
    label.name.toLowerCase() === 'stack' || 
    label.name.toLowerCase() === 'immortal-stack'
  );
  
  if (!hasStackLabel) {
    console.log(`Skipping issue #${issue.number} - no stack label`);
    return;
  }
  
  console.log(`New issue #${issue.number} in ${repository.full_name}: ${issue.title}`);
  
  await createClickUpTask({
    name: `GitHub Issue #${issue.number}: ${issue.title}`,
    description: `
# GitHub Issue

**Repository:** ${repository.full_name}
**Issue Number:** #${issue.number}
**Title:** ${issue.title}
**Author:** ${issue.user.login}

**Description:**
${issue.body || 'No description provided'}

**Labels:** ${issue.labels.map(label => label.name).join(', ')}

**Issue URL:** ${issue.html_url}
    `,
    listId: CLICKUP_LISTS.DEV_BACKLOG,
    tags: ['github', 'issue', repository.name]
  });
}

/**
 * Create a task in ClickUp
 * @param {Object} taskData - The task data
 */
async function createClickUpTask({ name, description, listId, tags }) {
  if (!CLICKUP_API_TOKEN) {
    console.log('ClickUp integration not configured (missing API token)');
    return;
  }
  
  if (!listId) {
    console.log('ClickUp list ID not configured');
    return;
  }
  
  try {
    const response = await axios.post(
      `${CLICKUP_API_URL}/list/${listId}/task`,
      {
        name,
        description,
        tags
      },
      {
        headers: {
          'Authorization': CLICKUP_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`Created ClickUp task: ${response.data.id} - ${name}`);
    return response.data;
  } catch (error) {
    console.error('Error creating ClickUp task:', error.message);
    if (error.response) {
      console.error('ClickUp API response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Log GitHub event to MongoDB
 * @param {Object} data - The event data
 * @param {String} eventType - The event type
 */
async function logEventToMongoDB(data, eventType) {
  // This is a placeholder for future MongoDB integration
  console.log(`[MongoDB] Logging GitHub ${eventType} event to database`);
  
  // TODO: Implement MongoDB logging
  // Example implementation:
  // const event = {
  //   source: 'github',
  //   type: eventType,
  //   data: data,
  //   timestamp: new Date(),
  //   repository: data.repository.full_name
  // };
  // await db.collection('github_events').insertOne(event);
}

module.exports = { processGithubEvent };
