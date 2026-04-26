# Autodesk Forma MCP — Team Setup Guide

This MCP (Model Context Protocol) server connects **Claude Code** directly to **Autodesk Construction Cloud (ACC) / Forma** APIs. Once installed, you can use plain English in Claude Code to query and manage projects, issues, RFIs, submittals, cost management, sheets, and more — no API coding required.

**408 tools** across 22 modules:
Projects · Hub Admin · Issues · RFIs · Forms · Submittals · Assets · Cost Management · Takeoff · Sheets · Documents · Permissions · Locations · Photos · Reviews · Transmittals · Relationships · Model Coordination · Model Properties · AutoSpecs · Data Connector · Auth

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 18+** | Download from https://nodejs.org |
| **Claude Code** | Install from https://claude.ai/code |
| **Autodesk APS app** | See Step 1 below |
| **ACC account** | Must be a member of at least one ACC project |

---

## Step 1 — Create an Autodesk APS App (team lead does this once)

> If someone on your team already has an APS app with the required scopes, skip to Step 2 and use their credentials.

1. Go to **https://aps.autodesk.com** → sign in with your Autodesk account
2. Click **My Apps** → **Create App**
3. Select **Forma API** (or any ACC-related API product)
4. Under **APIs & Services**, enable:
   - `Data Management API`
   - `BIM 360 API` / `ACC API`
5. Under **OAuth**, add the callback URL: `http://localhost:3001/callback`
6. Enable scopes: `data:read data:write data:create account:read account:write`
7. Save — note your **Client ID** and **Client Secret**

> The app only needs to be created once. All teammates use the same Client ID and Secret but each person authenticates individually with their own Autodesk account.

---

## Step 2 — Install the MCP Server

```bash
# 1. Navigate to this folder in a terminal
cd "Autodesk-forma-MCP-all APIs"

# 2. Install dependencies
npm install

# 3. Copy the env template and fill in your credentials
cp .env.example .env
```

Open `.env` in any text editor and fill in:

```env
APS_CLIENT_ID=your_client_id_here
APS_CLIENT_SECRET=your_client_secret_here
APS_CALLBACK_URL=http://localhost:3001/callback
APS_SCOPES=data:read data:write data:create account:read account:write
APS_REGION=US                          # or EMEA or APAC — must match your ACC account region
APS_ACCOUNT_ID=your_account_id_here   # find this in ACC Admin → the URL contains it
```

**How to find your Account ID:**
- Log into ACC at https://acc.autodesk.com
- Go to **Admin** — the URL will contain your account ID (looks like `a.YWNj...`)
- Or ask Claude: "what's my account ID?" after setup

---

## Step 3 — Authenticate with your Autodesk account

Each team member runs this once (and again after the token expires, ~60 min):

```bash
node auth-trigger.js
```

This opens a browser window. Log in with **your own Autodesk account**. After the "Authentication successful" message, close the browser tab.

> Your credentials are stored locally in `token.json`. Never share this file.

---

## Step 4 — Configure Claude Code

The `.mcp.json` file in this folder is pre-configured. Claude Code picks it up automatically when you open this folder.

**To verify Claude Code sees the MCP server:**

1. Open Claude Code in this folder: `claude .`
2. Type: `check auth status`
3. You should see your Autodesk account details

If it says authentication required, run `node auth-trigger.js` again.

---

## Step 5 — Verify it works

Try these prompts in Claude Code:

```
Show me all my hubs and projects
```

```
List all open issues in project [paste your project ID]
```

```
What is my account ID?
```

---

## Re-authenticating (token expires every ~60 minutes)

```bash
node auth-trigger.js
```

Or ask Claude: `"start auth flow"` — it will give you a browser link.

---

## Key project IDs

Update this table with your team's project IDs:

| Project | ID |
|---------|----|
| (add your projects here) | `b.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

> Project IDs always start with `b.`. Find them by asking Claude: `"show me all my projects"`.

---

## Available tools — what you can ask Claude to do

| Area | Example prompts |
|------|----------------|
| **Projects** | "Show all my hubs and projects" |
| **Hub Admin** | "List all users in my account", "Add user@company.com to project X" |
| **Issues** | "List all open issues in project X", "Create a coordination issue titled..." |
| **RFIs** | "Create an RFI about the waterproofing spec", "Show all open RFIs assigned to John" |
| **Forms** | "List all submitted daily inspection forms", "Fill in and submit a JHA form" |
| **Submittals** | "Create a shop drawing submittal for spec 03300", "Transition submittal X to review" |
| **Assets** | "Export all assets in project X", "Update status of assets MVS-001 to MVS-010 to Installed" |
| **Cost Management** | "List all budgets", "Create a PCO for revised entrance layout", "Show open change orders" |
| **Takeoff** | "Show all takeoff packages and items for project X" |
| **Sheets** | "List all sheets in the current version set", "Export sheets to PDF" |
| **Documents** | "Navigate to the Drawings folder", "Find all files named Foundation Plan" |
| **Permissions** | "What folders can user X access?", "Give user X editor access to Drawings folder" |
| **Locations** | "Show the full location hierarchy", "Create location nodes for Floor 1 and Floor 2" |
| **Photos** | "Find photos tagged as safety issues this week" |
| **Reviews** | "Create a 3-step structural review workflow", "Show all open reviews" |
| **Relationships** | "Find everything linked to asset X", "Link asset X to issue Y" |
| **Model Coordination** | "Show all clash tests for the structural model", "Find clashes between MEP and structural" |
| **AutoSpecs** | "Show the AutoSpecs submittal log for project X" |
| **Data Connector** | "Create a weekly export of issues and cost data", "Download the latest data extract" |
| **Auth** | "Check auth status", "Start auth flow" |

For detailed workflow chains, see **CLAUDE.md** in this folder.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Authentication failed" | Run `node auth-trigger.js` and log in again |
| "Permission denied" | Check that your Autodesk account is a member of the project |
| "Not found - verify the ID is correct" | Ensure the project ID starts with `b.` |
| "Rate limited - wait 30 seconds" | Wait ~30s and retry |
| MCP tools not appearing in Claude Code | Close and reopen Claude Code in this folder |
| Wrong region errors | Set `APS_REGION=EMEA` or `APS_REGION=APAC` in `.env` to match your ACC account |

---

## Security notes

- **Never share your `.env` file or `token.json`** — they contain credentials
- The `.env.example` file is safe to share (it has no real credentials)
- Each person must run `node auth-trigger.js` with their own Autodesk account
- The APS app Client ID and Secret can be shared within the team (from the team lead)
- Token auto-refreshes every ~60 minutes; just re-run `auth-trigger.js` if you hit auth errors
