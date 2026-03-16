# Feedback Form Setup Guide

This connects the in-app feedback button to GitHub Issues via a Google Form.

## Step 1: Create the Google Form (~3 min)

1. Go to https://docs.google.com/forms and create a new blank form
2. Title it "WhaTo Feedback"
3. Add these 3 questions:
   - **Type** — Dropdown, options: `Bug`, `Feature`
   - **Title** — Short answer, required
   - **Description** — Paragraph, optional
4. Click **Send** → copy the form link (the one ending in `/viewform`)

## Step 2: Get the Form Entry IDs (~1 min)

1. Click the three-dot menu on your form → **Get pre-filled link**
2. Fill in dummy answers for each field, click **Get link**
3. The URL will look like:
   ```
   https://docs.google.com/forms/d/e/XXXXX/viewform?entry.111111=Bug&entry.222222=test&entry.333333=desc
   ```
4. Note the entry IDs: `111111` (Type), `222222` (Title), `333333` (Description)

## Step 3: Update the App

In `src/components/FeedbackModal.tsx`, replace the two placeholders:

```typescript
const FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_ACTUAL_FORM_ID/viewform';
```

And in the `openForm` function, replace `TYPE_ENTRY_ID` with the actual entry ID for the Type field:

```typescript
Linking.openURL(`${FORM_URL}?entry.111111=${type}`);
```

## Step 4: Create a GitHub Personal Access Token (~2 min)

1. Go to https://github.com/settings/tokens?type=beta (Fine-grained tokens)
2. Click **Generate new token**
3. Name: `whato-feedback-bot`
4. Repository access: select **Only select repositories** → pick your Whato repo
5. Permissions: **Issues** → Read and Write
6. Generate and copy the token

## Step 5: Add the Apps Script (~3 min)

1. Open your Google Form → click the three-dot menu → **Script editor**
2. Delete any existing code and paste the script below
3. Update the 3 constants at the top (`GITHUB_TOKEN`, `REPO_OWNER`, `REPO_NAME`)
4. Click **Save**
5. In the script editor, go to **Triggers** (clock icon on the left)
6. Click **+ Add Trigger**:
   - Function: `onFormSubmit`
   - Event source: From form
   - Event type: On form submit
7. Click **Save** — it will ask for authorization, approve it

### Apps Script Code

```javascript
// === CONFIGURATION ===
const GITHUB_TOKEN = 'github_pat_YOUR_TOKEN_HERE';
const REPO_OWNER = 'YOUR_GITHUB_USERNAME';
const REPO_NAME = 'YOUR_REPO_NAME';

function onFormSubmit(e) {
  const responses = e.response.getItemResponses();

  const type = responses[0].getResponse();        // "Bug" or "Feature"
  const title = responses[1].getResponse();        // Title
  const description = responses.length > 2
    ? responses[2].getResponse()
    : '';

  const label = type === 'Bug' ? 'bug' : 'enhancement';
  const prefix = type === 'Bug' ? '[Bug]' : '[Feature]';

  const issueTitle = `${prefix} ${title}`;
  const issueBody = [
    `**Type:** ${type}`,
    '',
    `**Description:**`,
    description || '_No description provided._',
    '',
    '---',
    '_Submitted via in-app feedback form_',
  ].join('\n');

  const payload = {
    title: issueTitle,
    body: issueBody,
    labels: [label],
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    payload: JSON.stringify(payload),
  };

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`Issue created: ${response.getContentText()}`);
  } catch (error) {
    Logger.log(`Error creating issue: ${error}`);
  }
}
```

## Step 6: Test It

1. Submit a test response through your Google Form
2. Check your GitHub repo's Issues tab — you should see a new issue with the correct label
3. Tap the `!` button in the app and submit through the form to verify the full flow

## Troubleshooting

- **Issues not appearing:** Check the Apps Script execution log (Executions tab in script editor)
- **403 from GitHub:** Token doesn't have Issues write permission, or wrong repo selected
- **Labels not applying:** Create `bug` and `enhancement` labels in your repo first (GitHub has these by default)
