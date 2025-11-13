/**
 * Cross-Repo Automation Helper Functions
 *
 * Reusable functions for managing cross-repository issue automation,
 * including project management, field copying, and label synchronization.
 */

/**
 * Parse a GitHub issue URL into its components
 * @param {string} url - GitHub issue URL (e.g., https://github.com/owner/repo/issues/123)
 * @returns {Object|null} - {owner, repo, number} or null if invalid
 */
function parseIssueUrl(url) {
  if (!url) return null;

  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3])
  };
}

/**
 * Check if an issue is in the same repository
 * @param {Object} issueRef - {owner, repo, number}
 * @param {string} currentOwner - Current repository owner
 * @param {string} currentRepo - Current repository name
 * @returns {boolean}
 */
function isSameRepo(issueRef, currentOwner, currentRepo) {
  return issueRef.owner === currentOwner && issueRef.repo === currentRepo;
}

/**
 * Get issue details from any repository
 * @param {Object} github - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} number - Issue number
 * @returns {Promise<Object>} - Issue data
 */
async function getIssue(github, owner, repo, number) {
  try {
    const response = await github.rest.issues.get({
      owner,
      repo,
      issue_number: number
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch issue ${owner}/${repo}#${number}:`, error.message);
    throw error;
  }
}

/**
 * Find a project by name (supports partial matching)
 * @param {Object} github - GitHub API client
 * @param {string} org - Organization name
 * @param {string} projectName - Project name to search for
 * @returns {Promise<Object|null>} - Project data or null
 */
async function findProject(github, org, projectName) {
  const query = `
    query($org: String!) {
      organization(login: $org) {
        projectsV2(first: 20) {
          nodes {
            id
            title
            number
          }
        }
      }
    }
  `;

  const result = await github.graphql(query, { org });
  const projects = result.organization.projectsV2.nodes;

  // Try exact match first
  let project = projects.find(p => p.title === projectName);

  // Fall back to case-insensitive partial match
  if (!project) {
    project = projects.find(p =>
      p.title.toLowerCase().includes(projectName.toLowerCase())
    );
  }

  return project || null;
}

/**
 * Get all fields for a project
 * @param {Object} github - GitHub API client
 * @param {string} projectId - Project node ID
 * @returns {Promise<Array>} - Array of field definitions
 */
async function getProjectFields(github, projectId) {
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations {
                    id
                    title
                    startDate
                    duration
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await github.graphql(query, { projectId });
  return result.node.fields.nodes;
}

/**
 * Find a specific field in a project
 * @param {Array} fields - Array of project fields
 * @param {string} fieldName - Name of field to find
 * @returns {Object|null} - Field definition or null
 */
function findField(fields, fieldName) {
  return fields.find(f => f.name === fieldName) || null;
}

/**
 * Check if an issue is already in a project
 * @param {Object} github - GitHub API client
 * @param {string} projectId - Project node ID
 * @param {string} issueNodeId - Issue node ID
 * @returns {Promise<Object|null>} - Project item or null
 */
async function findProjectItem(github, projectId, issueNodeId) {
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  id
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await github.graphql(query, { projectId });
  const items = result.node.items.nodes;

  return items.find(item => item.content && item.content.id === issueNodeId) || null;
}

/**
 * Add an issue to a project
 * @param {Object} github - GitHub API client
 * @param {string} projectId - Project node ID
 * @param {string} issueNodeId - Issue node ID
 * @returns {Promise<string>} - Project item ID
 */
async function addIssueToProject(github, projectId, issueNodeId) {
  const mutation = `
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
        }
      }
    }
  `;

  const result = await github.graphql(mutation, {
    projectId,
    contentId: issueNodeId
  });

  return result.addProjectV2ItemById.item.id;
}

/**
 * Update a single select field on a project item
 * @param {Object} github - GitHub API client
 * @param {string} projectId - Project node ID
 * @param {string} itemId - Project item ID
 * @param {string} fieldId - Field ID
 * @param {string} optionId - Option ID
 */
async function updateSingleSelectField(github, projectId, itemId, fieldId, optionId) {
  const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: $value
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `;

  await github.graphql(mutation, {
    projectId,
    itemId,
    fieldId,
    value: { singleSelectOptionId: optionId }
  });
}

/**
 * Update an iteration field on a project item
 * @param {Object} github - GitHub API client
 * @param {string} projectId - Project node ID
 * @param {string} itemId - Project item ID
 * @param {string} fieldId - Field ID
 * @param {string} iterationId - Iteration ID
 */
async function updateIterationField(github, projectId, itemId, fieldId, iterationId) {
  const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: $value
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `;

  await github.graphql(mutation, {
    projectId,
    itemId,
    fieldId,
    value: { iterationId }
  });
}

/**
 * Get project field values for an issue
 * @param {Object} github - GitHub API client
 * @param {string} projectId - Project node ID
 * @param {string} itemId - Project item ID
 * @returns {Promise<Object>} - Field values
 */
async function getProjectItemFields(github, projectId, itemId) {
  const query = `
    query($itemId: ID!) {
      node(id: $itemId) {
        ... on ProjectV2Item {
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                  }
                }
                optionId
              }
              ... on ProjectV2ItemFieldIterationValue {
                title
                iterationId
                field {
                  ... on ProjectV2IterationField {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await github.graphql(query, { itemId });
  return result.node.fieldValues.nodes;
}

/**
 * Determine issue type from title prefix
 * @param {string} title - Issue title
 * @returns {string|null} - Issue type or null
 */
function getIssueTypeFromTitle(title) {
  const typeMapping = {
    '[BUG]': 'Bug',
    '[EPIC]': 'Epic',
    '[FEATURE]': 'Feature',
    '[TASK]': 'Task',
    '[USER STORY]': 'User Story',
    '[STORY]': 'User Story'
  };

  for (const [prefix, type] of Object.entries(typeMapping)) {
    if (title.startsWith(prefix)) {
      return type;
    }
  }

  return null;
}

/**
 * Filter labels to copy (only specific categories)
 * @param {Array} labels - Array of label objects
 * @returns {Array} - Filtered label names
 */
function filterInheritableLabels(labels) {
  const inheritablePrefixes = [
    'priority:',
    'team:',
    'component:',
    'size:'
  ];

  return labels
    .filter(label =>
      inheritablePrefixes.some(prefix =>
        label.name.startsWith(prefix)
      )
    )
    .map(label => label.name);
}

/**
 * Copy labels from one issue to another
 * @param {Object} github - GitHub API client
 * @param {string} targetOwner - Target repository owner
 * @param {string} targetRepo - Target repository name
 * @param {number} targetNumber - Target issue number
 * @param {Array} labels - Array of label names to add
 */
async function copyLabels(github, targetOwner, targetRepo, targetNumber, labels) {
  if (labels.length === 0) return;

  try {
    await github.rest.issues.addLabels({
      owner: targetOwner,
      repo: targetRepo,
      issue_number: targetNumber,
      labels
    });
  } catch (error) {
    // Labels might not exist in target repo, that's okay
    console.warn(`Some labels could not be added to ${targetOwner}/${targetRepo}#${targetNumber}:`, error.message);
  }
}

/**
 * Copy milestone from one issue to another
 * @param {Object} github - GitHub API client
 * @param {string} targetOwner - Target repository owner
 * @param {string} targetRepo - Target repository name
 * @param {number} targetNumber - Target issue number
 * @param {Object|null} sourceMilestone - Source milestone object
 */
async function copyMilestone(github, targetOwner, targetRepo, targetNumber, sourceMilestone) {
  if (!sourceMilestone) return;

  try {
    // Try to find milestone by title in target repo
    const milestones = await github.rest.issues.listMilestones({
      owner: targetOwner,
      repo: targetRepo,
      state: 'all'
    });

    const targetMilestone = milestones.data.find(m => m.title === sourceMilestone.title);

    if (targetMilestone) {
      await github.rest.issues.update({
        owner: targetOwner,
        repo: targetRepo,
        issue_number: targetNumber,
        milestone: targetMilestone.number
      });
    } else {
      console.warn(`Milestone "${sourceMilestone.title}" not found in ${targetOwner}/${targetRepo}`);
    }
  } catch (error) {
    console.error(`Failed to copy milestone:`, error.message);
  }
}

/**
 * Add a comment to an issue
 * @param {Object} github - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} number - Issue number
 * @param {string} body - Comment body
 */
async function addComment(github, owner, repo, number, body) {
  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: number,
    body
  });
}

/**
 * Delay execution for rate limiting
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export all functions
module.exports = {
  parseIssueUrl,
  isSameRepo,
  getIssue,
  findProject,
  getProjectFields,
  findField,
  findProjectItem,
  addIssueToProject,
  updateSingleSelectField,
  updateIterationField,
  getProjectItemFields,
  getIssueTypeFromTitle,
  filterInheritableLabels,
  copyLabels,
  copyMilestone,
  addComment,
  delay
};
