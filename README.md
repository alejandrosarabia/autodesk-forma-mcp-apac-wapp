# Autodesk Forma MCP — APAC Trial

MCP (Model Context Protocol) server that connects **Claude Code** to **Autodesk Construction Cloud (ACC)** APIs. Use plain English in Claude Code to query and manage projects, issues, RFIs, submittals, cost management, sheets, and more — no API coding required.

**408 tools** across 22 modules:
Projects, Hub Admin, Issues, RFIs, Forms, Submittals, Assets, Cost Management, Takeoff, Sheets, Documents, Permissions, Locations, Photos, Reviews, Transmittals, Relationships, Model Coordination, Model Properties, AutoSpecs, Data Connector, Auth

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 18+** | [nodejs.org](https://nodejs.org) |
| **Claude Code** | [claude.ai/code](https://claude.ai/code) |
| **Autodesk APS app** | See setup guide below |
| **ACC account** | Must be a member of at least one ACC project |

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/autodesk-forma-mcp-apac-trial.git
cd autodesk-forma-mcp-apac-trial

# 2. Install dependencies
npm install

# 3. Copy the env template and fill in your credentials
cp .env.example .env
# Edit .env with your APS Client ID, Secret, Account ID, and region

# 4. Authenticate with your Autodesk account
node auth-trigger.js
# Opens browser — log in with your Autodesk account

# 5. Open in Claude Code
claude .
```

Claude Code picks up the `.mcp.json` automatically. Type `check auth status` to verify.

## Full Setup Guide

See [TEAM-SETUP.md](TEAM-SETUP.md) for detailed instructions including:
- Creating an Autodesk APS app
- Configuring credentials
- Finding your Account ID
- Troubleshooting

## What You Can Do

| Area | Example Prompts |
|------|----------------|
| **Projects** | "Show all my hubs and projects" |
| **Issues** | "List all open issues", "Create a defect issue" |
| **RFIs** | "Create an RFI about waterproofing", "Show open RFIs" |
| **Forms** | "List submitted inspection forms", "Fill in a JHA form" |
| **Submittals** | "Create a shop drawing submittal", "Transition to review" |
| **Assets** | "Export all assets", "Update status to Installed" |
| **Cost** | "Show budgets", "Create a PCO", "List change orders" |
| **Documents** | "Navigate to Drawings folder", "Export files to PDF" |
| **Sheets** | "List all sheets", "Export to PDF with markups" |
| **Model Coordination** | "Show clash tests", "Find clashes between MEP and structural" |
| **Reviews** | "Create a review workflow", "Show open reviews" |
| **Data Connector** | "Create a weekly data export", "Download latest extract" |

See [CLAUDE.md](CLAUDE.md) for detailed workflow chains.

## Telegram Bot (Optional)

A Telegram bot interface is included (`telegram-bot.js`) that lets team members interact with ACC via Telegram. Add these to your `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ALLOWED_USERS=comma_separated_user_ids
ANTHROPIC_API_KEY=your_anthropic_key
```

Then run: `node telegram-bot.js`

## Re-authenticating

Tokens expire every ~60 minutes. To re-authenticate:
- Ask Claude: `"start auth flow"` or `"check auth status"`
- Or run: `node auth-trigger.js`

## Security

- **Never commit your `.env` or token files** — they are in `.gitignore`
- Each person authenticates individually with their own Autodesk account
- The APS Client ID and Secret can be shared within the team

## License

MIT
