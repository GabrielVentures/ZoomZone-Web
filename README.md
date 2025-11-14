# ShelfTagSnap Web Admin Panel

Web-based admin dashboard for managing scan records, AI processing, and cost analytics.

## 📋 Overview

Modern web admin panel built for ShelfTagSnap, providing comprehensive management capabilities for shelf tag scan records, AI processing results, user management, and cost analytics.

## 🏗️ Architecture

### Tech Stack
- **Framework**: [Refine](https://refine.dev/) v4 - Headless React framework
- **UI Library**: Ant Design v5 - Enterprise UI components
- **Build Tool**: Vite - Next generation frontend tooling
- **Language**: TypeScript
- **Backend**: Firebase Firestore + Cloud Functions
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting

### Core Modules

**Pages**
- `pages/login/` - Authentication page
- `pages/dashboard/` - Main dashboard with statistics and charts
- `pages/scan-records/` - Record list, detail, and management
- `pages/users/` - User management (admin)

**Components**
- `components/ai/` - AI-related UI components
  - `AIStatusTag` - Status visualization (Completed/Failed/Pending)
  - `AIErrorAlert` - User-friendly error messages
  - `RetryButton` - Single record retry
  - `BatchRetryModal` - Batch retry interface

**Providers**
- `providers/firestoreDataProvider.ts` - Firestore data operations
- `providers/authProvider.ts` - Firebase Authentication

## 🚀 Features

### 1. Dashboard
- **8 Key Metrics** - Total scans, AI processed, costs, tokens, users
- **5 Interactive Charts**
  - Daily cost trend (line chart)
  - Token usage by type (pie chart)
  - Upload activity timeline (bar chart)
  - AI status distribution (donut chart)
  - Top users by cost (bar chart)
- **Real-time Statistics** - Auto-refresh capabilities

### 2. Scan Records Management
- **List View** - Paginated table with sorting and filtering
- **Search & Filter** - By username, merchant, AI status
- **Batch Operations** - Admin batch retry (up to 50 records)
- **Detail View** - Complete record information with image preview
- **CSV Export** - Export all records with AI results (22 columns)

### 3. AI Processing Management
- **Status Visualization** - Color-coded status tags
- **Manual Retry** - Single record retry button
- **Batch Retry** - Admin-only bulk retry functionality
- **Error Handling** - User-friendly error messages and retry options
- **Progress Tracking** - Real-time batch processing feedback

### 4. User Management
- **User List** - View all users with statistics
- **Cost Analytics** - Per-user cost tracking
- **Quota Management** - Configure daily limits
- **Role Management** - Admin role assignment
- **CSV Export** - User costs and statistics

### 5. Cost Analytics
- **Daily Tracking** - Monitor daily AI processing costs
- **User Breakdown** - Cost per user analysis
- **Token Usage** - Input/output token statistics
- **Trend Analysis** - Historical cost trends
- **Alert System** - Cost threshold notifications

## 📡 Integration with Backend

### Cloud Functions
- `retrySingleScan` - Retry failed scan processing
- `retryFailedScans` - Batch retry all failed scans
- `getFailedScansCount` - Get count of failed records
- `getAIQuotaStatus` - Get user quota information
- `updateUserAIQuota` - Update user quota limits (admin)
- `getAuditLogs` - Retrieve activity logs (admin)

### Firestore Collections
- `scan_records` - Scan record documents
- `users` - User profiles and quotas
- `settings` - Global configuration
- `activity_logs` - Audit trail
- `batch_retries` - Batch operation tracking

## 🚢 Deployment

### Prerequisites
- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project configured

### Build for Production
```bash
npm install
npm run build
```

### Deploy to Firebase Hosting
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy with preview channel
firebase hosting:channel:deploy preview

# View deployment
firebase hosting:channel:open preview
```

### Environment Configuration
The app automatically detects Firebase configuration from the hosting environment. No manual environment variables needed.

## 📊 Project Structure

```
src/
├── pages/
│   ├── login/              # Authentication
│   ├── dashboard/          # Main dashboard
│   ├── scan-records/       # Record management
│   │   ├── list.tsx        # Record list with filters
│   │   └── show.tsx        # Record detail view
│   └── users/              # User management
├── components/
│   └── ai/                 # AI-related components
│       ├── AIStatusTag.tsx
│       ├── AIErrorAlert.tsx
│       ├── RetryButton.tsx
│       └── BatchRetryModal.tsx
├── providers/
│   ├── firestoreDataProvider.ts   # Data operations
│   └── authProvider.ts             # Authentication
├── types/
│   └── index.ts            # TypeScript definitions
├── App.tsx                 # Main app component
└── main.tsx                # Entry point
```

## 🔧 Development

### Local Development
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop** - Full feature set with multi-column layouts
- **Tablet** - Adaptive grid layouts
- **Mobile** - Touch-optimized UI with simplified views

## 🎨 UI Features

### Visual Components
- **Status Tags** - Color-coded AI processing status
- **Progress Indicators** - Real-time batch operation progress
- **Error Alerts** - User-friendly error messages
- **Image Previews** - Zoomable scan record images
- **Charts** - Interactive data visualizations
- **Responsive Tables** - Mobile-optimized data tables

### User Experience
- **Search & Filter** - Quick record lookup
- **Pagination** - Efficient large dataset handling
- **Sorting** - Multi-column sorting
- **Export** - CSV data export
- **Real-time Updates** - Auto-refresh data

## 📚 Resources

- [Refine Documentation](https://refine.dev/docs/)
- [Ant Design Documentation](https://ant.design/docs/react/introduce)
- [Vite Documentation](https://vitejs.dev/guide/)
- [Firebase Documentation](https://firebase.google.com/docs)

---

**Version**: 2.1.0
**Last Updated**: 2025-11-14
**Node Version**: 18+
