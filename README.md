# ShelfTagSnap Web Admin Panel

> 📊 Admin dashboard for managing scan records, AI processing results, and cost analytics

## 🎯 Overview

This is the web admin panel for ShelfTagSnap, built as part of **Milestone 2: Cloud Backup & AI Recognition**.

**Current Status**: Phase 4.1 - Using Mock Data (Firebase Firestore connection pending)

## 🛠️ Tech Stack

- **Framework**: [Refine](https://refine.dev/) v4
- **UI Library**: Ant Design v5
- **Build Tool**: Vite
- **Language**: TypeScript
- **Backend (Future)**: Firebase Firestore + Cloud Functions
- **Current**: Mock data provider

## 📁 Project Structure

```
src/
├── pages/
│   ├── login/           # Login page
│   ├── dashboard/       # Main dashboard
│   └── scan-records/    # Scan record list & detail pages
├── providers/
│   ├── mockDataProvider.ts   # Mock data provider (temporary)
│   └── authProvider.ts        # Mock auth provider (temporary)
├── types/
│   └── index.ts         # TypeScript type definitions
├── mocks/
│   └── scanRecords.ts   # Mock data for development
├── App.tsx              # Main app component
└── main.tsx             # Entry point
```

## 📥 CSV Export Features

### ⭐ Scan Records Export (CRITICAL)

**Location**: Scan Records page → "Export CSV" button

**Exported Fields** (22 columns):
1. Record ID
2. Username
3. Merchant
4. Barcode
5. Store Location
6. Device Date
7. Upload Date
8. AI Status
9. **AI Product Title** ⭐
10. **AI Price** ⭐
11. **AI Category** ⭐
12. **AI Brand** ⭐
13. **AI Size** ⭐
14. **AI Description** ⭐
15. **AI Confidence (%)** ⭐
16. AI Cost (USD)
17. AI Tokens
18. GPS Latitude
19. GPS Longitude
20. Image Filename
21. Image URL
22. AI Error (if any)

**Features**:
- ✅ Respects current filters (search + AI status)
- ✅ Automatic CSV escaping (commas, quotes, newlines)
- ✅ Timestamp in filename (scan-records-2025-11-03-143025.csv)
- ✅ Opens in Excel/Google Sheets perfectly
- ✅ Complete AI recognition results included

### 💰 User Costs Export

**Location**: User Costs page → "Export CSV" button

**Exported Fields** (6 columns):
1. Username
2. Record Count
3. Total Cost (USD)
4. Avg Cost/Record
5. Total Tokens
6. Last Upload

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ (Recommended: v22.10.0)
- npm v9+ (Recommended: v10.9.0)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Login

The app uses a **mock authentication provider** for development:

- **Email**: Any email (e.g., `admin@shelftag-snap.com`)
- **Password**: Any password

## 📊 Features

### ✅ Implemented (Phase 4.1 & 4.2)

- ✅ **Login Page** - Simple email/password authentication
- ✅ **Dashboard** - Statistics overview with 8 key metrics + 5 charts
- ✅ **Scan Records List** - Table view with filters and search
- ✅ **Scan Record Detail** - Detailed view of individual records
- ✅ **AI Status Tracking** - Completed, Pending, Failed states
- ✅ **Cost Analytics** - AI processing cost tracking
- ✅ **📥 Scan Records CSV Export** - ⭐ **CRITICAL FEATURE** - Export all scan data with complete AI results
- ✅ **📥 User Costs CSV Export** - Export user-level cost analytics
- ✅ **📊 Dashboard Charts** - 5 interactive charts (Cost trend, Token usage, Activity, Status distribution, User costs)
- ✅ **📱 Responsive Design** - Mobile, Tablet, Desktop optimized
- ✅ **Mock Data Provider** - Simulates Firestore operations

### ⏸️ Blocked (Waiting for Firebase Blaze Plan)

- ⏸️ Firebase Firestore connection
- ⏸️ Firebase Authentication integration
- ⏸️ Real-time data sync
- ⏸️ Cloud Functions integration

## 📈 Development Roadmap

### Phase 4.1 - Project Initialization ✅
- [x] F.1: Create Refine project (1h)
- [x] F.2: Configure Firebase connection with mock data (1h)

### Phase 4.2 - Page Development 🔄
- [x] F.3: Create login page (1.5h)
- [x] F.4: Create dashboard page (4h)
- [x] F.5: Create scan records list page (4h)
- [x] F.6: Create scan records detail page (3h)
- [ ] F.7: Responsive layout optimization (1.5h)
- [ ] F.8: Dashboard cost statistics cards (2h)
- [ ] F.9: User cost details page (3h)

### Future Phases
- Phase 1: Firebase infrastructure setup
- Phase 3: Cloud Functions + GPT-4o integration
- Phase 5: Integration testing

## 🧪 Mock Data

The project includes 8 sample scan records with:

- **3 Users**: john_doe, jane_smith, bob_wilson
- **5 AI Completed** records (with varying confidence levels)
- **2 AI Pending** records
- **1 AI Failed** record

Mock data location: `src/mocks/scanRecords.ts`

## 🔧 Configuration

### Environment Variables (Future)

When Firebase is connected, create a `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 📝 TypeScript Types

All data models match the iOS app's CloudScanRecord structure:

- `ScanRecord` - Main scan record model
- `AIResult` - AI recognition results
- `AICost` - Cost tracking
- `User` - User information
- `DashboardStats` - Statistics

## 🎨 UI Components

Built with Ant Design:

- Tables with sorting, filtering, pagination
- Cards for statistics
- Forms for authentication
- Tags for status indicators
- Images with preview
- Responsive grid layout

## 🔒 Security Notes

⚠️ **Current implementation uses mock authentication** - Do not deploy to production without implementing proper Firebase Authentication.

## 📚 Related Documentation

- [Refine Documentation](https://refine.dev/docs/)
- [Ant Design Documentation](https://ant.design/docs/react/introduce)
- [Vite Documentation](https://vitejs.dev/guide/)
- [Firebase Documentation](https://firebase.google.com/docs)

## 👥 Project Team

- **iOS Development**: Phase 2 completed (12 tasks)
- **Backend Development**: Phase 0 completed (OpenAI security)
- **Web Development**: Phase 4.1 & 4.2 in progress

## 📄 License

Proprietary - ShelfTagSnap Project
