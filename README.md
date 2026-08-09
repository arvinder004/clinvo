# Clinvo

<div align="center">
  <img src="public/icon.png" alt="Clinvo Logo" width="120" height="120" />
  <p><strong>Modern Offline Clinic Management & Receipt System</strong></p>
</div>

## Overview

Clinvo is a desktop application built to streamline clinic operations — managing patient receipts, financial tracking, and medical history in a fully offline environment. All data is stored locally on the machine, ensuring complete privacy and reliability without any internet dependency.

## Features

- **Receipt Generation** — Create professional receipts with support for Cash and Online payment modes.
- **Financial Summaries** — Automatically track clinic earnings with filtering by payment mode and date range.
- **Patient History** — Maintain a structured view of previous patient visits and payment records.
- **Doctor & Service Management** — Manage clinic doctors and services from a centralized interface.
- **PIN Lock** — Secure the application with a user-defined PIN.
- **Auto Backup** — Daily automatic backups with a 7-day retention policy, plus manual backup support.
- **Offline-First** — No internet connection required. All data is persisted locally using SQLite.
- **Cross-Platform** — Available for both macOS and Windows.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Desktop | Electron |
| Database | SQLite via `better-sqlite3` |
| Icons | `lucide-react` |
| Date Utilities | `date-fns` |

## Releases

Pre-built installers for macOS and Windows are available on the [Releases](https://github.com/arvinder004/clinvo/releases) page.

## License

Clinvo is proprietary software. All rights reserved. Unauthorized distribution or modification is prohibited.
