# App Store Connect – Privacy Nutrition Label Checklist

Use this document when filling out **App Privacy** in App Store Connect.
The answers match what the app currently collects and what the code in this
repo actually does. Update this file _and_ the App Store Connect entry any
time you add/remove a data collection surface or integrate a new SDK.

Last reviewed: **2026-04**

## TL;DR for the reviewer

- The app collects account data (email, username, bio, avatar) and user
  content (show visits, notes, ranked lists).
- The app does **not** use tracking SDKs, does **not** link data to third
  parties for advertising, and does **not** run cross-app tracking. No
  `NSUserTrackingUsageDescription` is required.
- Location is collected only via "while using the app" and only to power the
  map feature. It is tied to the user's account (needed for their own visit
  history) but is not shared.

## Declared data types

| Category                     | Data type                         | Collected? | Linked to user? | Used for tracking? | Purpose                                  |
| ---------------------------- | --------------------------------- | ---------- | --------------- | ------------------ | ---------------------------------------- |
| Contact Info                 | Email address                     | Yes        | Yes             | No                 | App functionality, auth                  |
| Contact Info                 | Name                              | Yes        | Yes             | No                 | App functionality (display name)         |
| Contact Info                 | Phone number                      | No         | —               | —                  | —                                        |
| Contact Info                 | Physical address                  | No         | —               | —                  | —                                        |
| Contact Info                 | Other user contact info           | No         | —               | —                  | —                                        |
| Health & Fitness             | —                                 | No         | —               | —                  | —                                        |
| Financial Info               | —                                 | No         | —               | —                  | —                                        |
| Location                     | Precise location                  | No         | —               | —                  | —                                        |
| Location                     | Coarse location                   | Yes        | Yes             | No                 | Map/visit features; while-in-use only    |
| Sensitive Info               | —                                 | No         | —               | —                  | —                                        |
| Contacts                     | —                                 | No         | —               | —                  | —                                        |
| User Content                 | Photos or videos                  | Yes        | Yes             | No                 | User avatar & theatre photos on visits   |
| User Content                 | Customer support                  | Yes        | Yes             | No                 | Feedback + UGC abuse reports             |
| User Content                 | Other user content                | Yes        | Yes             | No                 | Visit notes, bio, list titles            |
| Browsing History             | —                                 | No         | —               | —                  | —                                        |
| Search History               | —                                 | No         | —               | —                  | —                                        |
| Identifiers                  | User ID                           | Yes        | Yes             | No                 | Authenticating API requests              |
| Identifiers                  | Device ID                         | No         | —               | —                  | —                                        |
| Purchases                    | —                                 | No         | —               | —                  | —                                        |
| Usage Data                   | Product interaction               | No         | —               | —                  | —                                        |
| Usage Data                   | Advertising data                  | No         | —               | —                  | —                                        |
| Usage Data                   | Other usage data                  | No         | —               | —                  | —                                        |
| Diagnostics                  | Crash data                        | No         | —               | —                  | —                                        |
| Diagnostics                  | Performance data                  | No         | —               | —                  | —                                        |
| Diagnostics                  | Other diagnostic data             | No         | —               | —                  | —                                        |
| Surroundings                 | —                                 | No         | —               | —                  | —                                        |
| Body                         | —                                 | No         | —               | —                  | —                                        |
| Other Data                   | —                                 | No         | —               | —                  | —                                        |

## Where the data lives

- Convex database: `convex/schema.ts`. Primary tables that contain personal
  data: `users`, `visits`, `userLists`, `userReports`, `activityPosts`,
  `userStats`.
- Better Auth component: sessions and accounts (email/password, passkey,
  Apple, Google) — internal to Convex.
- Expo Notifications: push tokens stored in `users.pushTokens`.
- Image storage: Convex file storage for avatars and theatre photos.

## Third-party SDKs

- None that collect personal data. The app uses Expo, Convex, Better Auth,
  and MapKit — none of which act as ad/tracking networks. Confirm by running
  `rg -n "react-native-firebase|analytics|amplitude|mixpanel|facebook"`
  before each submission.

## Info.plist strings (see `app.config.js`)

- `NSLocationWhenInUseUsageDescription`: "Your location is used to show
  nearby theatres and map your visits."
- `NSPhotoLibraryUsageDescription`: "Your photo library is used to pick a
  profile picture or attach a theatre photo to a visit."
- Camera and microphone are **not** requested.
- Tracking transparency is **not** required because the app does not run any
  ad-tracking SDKs.

## Account deletion

- Implemented in `convex/account.ts` → `deleteMyAccount`. UI entry point in
  `src/features/profile/screens/EditProfileScreen.tsx`. Cascades all
  user-owned rows, tagged references, Better Auth records, and stored blobs.
- TODO: revoke Apple refresh tokens for Sign-in-with-Apple users against
  `https://appleid.apple.com/auth/revoke` as part of deletion (tracked in a
  comment in `convex/account.ts`).

## UGC safety (App Store guideline 1.2)

- In-app **report** flow: `src/features/safety/components/ReportSheet.tsx`
  → `convex/social/safety.ts:reportUser|reportActivityPost|reportVisit`.
- In-app **block** flow: `src/features/safety/components/useBlockUser.ts`
  → `convex/social/safety.ts:blockUser|unblockUser`. Symmetric: mutual
  invisibility, auto-unfollow, retroactive tag stripping.
- Admin review surface: `convex/admin/userReports.ts` +
  `website/src/app/admin/reports/page.tsx`. Target SLA: **resolve open
  reports within 24 hours**.
- Blocked-users list: `src/features/safety/screens/BlockedUsersScreen.tsx`
  linked from Settings drawer.

## Legal links (shown in-app)

- Privacy Policy: https://stageworth.vercel.app/privacy
- Terms of Service: https://stageworth.vercel.app/terms
- Both linked from Settings → Privacy Policy / Terms of Service rows in
  `src/features/profile/components/SettingsDrawer.tsx`, sourced from
  `src/constants/urls.ts`.

## Pre-submission sanity checklist

- [ ] App Store Connect nutrition label matches the table above.
- [ ] Privacy Policy URL in App Store Connect matches the one linked in-app.
- [ ] Privacy Policy page mentions account deletion, reporting, and
      blocking.
- [ ] Demo account credentials provided in App Review Information include
      a second account you can use to exercise Report + Block.
- [ ] App Review Notes mention:
      - "Users can block from profile / feed overflow menus."
      - "Users can report users, feed posts, and visits."
      - "Open reports are reviewed at /admin/reports within 24 hours."
      - "Account deletion is available in Edit Profile."
- [ ] Spot-check that `rg 'analytics\|mixpanel\|amplitude\|firebase/analytics'`
      still returns no hits.
