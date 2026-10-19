# SmartMatch Server

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string used to sign login tokens |
| `CLOUDINARY_URL` | for uploads | `cloudinary://<api_key>:<api_secret>@<cloud_name>` (Cloudinary dashboard > Settings > API Keys) |
| `PORT` | no | Default `3000` |
| `CLOUDINARY_FOLDER` | no | Folder for uploaded files, default `smartmatch` |
| `CORS_ORIGINS` | no | Comma-separated sites allowed to call the API. Default: localhost:5173 and the Vercel site |
| `TRUST_PROXY` | no | Number of proxies in front of the server, default `3` (Render) |

The server refuses to start without `MONGO_URI` and `JWT_SECRET`, or when the database can't be reached.
Without `CLOUDINARY_URL` it starts, but file uploads return 503.

## Running the Server

```bash
npm start      # rate limits on (NODE_ENV is not development or test)
npm run dev    # restarts on file changes; sets NODE_ENV=development so login and register rate limits are off
```

`npm run dev` is the local start. It sets `NODE_ENV=development`, which turns the login and register rate limits off so retries while testing do not lock an account. `npm test` sets `NODE_ENV=test` and does the same. Any other value, including leaving `NODE_ENV` unset, keeps those limits on.

The server will run on http://localhost:3000

## ID number index

Email-only accounts have no `idNumber`. Registration works only when `users.idNumber_1` is unique and sparse. From the `server` directory, with `MONGO_URI` in `.env`:

```bash
npm run fix:idNumberIndex
```

If `idNumber_1` exists and is not sparse, the script drops it. If the index is missing after that, it creates `{ idNumber: 1 }` as a unique sparse index named `idNumber_1`. An index that is already sparse is left in place. The script prints the final index names and options. It is safe to run again.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Profile
- `POST /api/profile` - Create profile (JSON, or multipart with `image` and `resumePdf` files)
- `GET /api/profile/me` - Get own profile
- `GET /api/profile/:userId` - Get other user's profile (access control applies)
- `PUT /api/profile` - Update profile (JSON, or multipart with `image` and `resumePdf` files)
- `DELETE /api/profile` - Delete profile and its files

### Preference
- `POST /api/preference` - Create preferences
- `GET /api/preference/me` - Get preferences
- `PUT /api/preference` - Update preferences (a field sent empty is cleared)

### Interest
- `POST /api/interest` - Send interest to user
- `GET /api/interest/incoming` - Get incoming interests
- `GET /api/interest/outgoing` - Get outgoing interests
- `PUT /api/interest/respond` - Accept a pending interest (the receiver), or decline a pending or accepted interest (either person)
- `POST /api/interest/send-to-manager` - Approve interest to send to manager

### Match
- `GET /api/match` - Get mutual matches
- `GET /api/match/candidates` - Get candidate matches based on preferences

### Admin (admin role only)
- `GET /api/admin/pending-matches` - Get pending matches
- `DELETE /api/admin/pending-match` - Remove pending match
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:userId/profile` - Get a user's profile

### Files
- `GET /api/files/:userId/image` - Open a profile photo (login required; checked on every request)
- `GET /api/files/:userId/resume` - Open a resume PDF (login required; checked on every request)

## File Upload

Files are stored only in Cloudinary - never on the server's disk.
- Image (`image`): JPEG, PNG, GIF or WEBP. Large photos are resized to 1600px and their metadata (e.g. GPS location) is removed.
- Resume (`resumePdf`): PDF
- Maximum file size: 10MB
- The real file type is checked from the file's content, not only from the type the browser declares.

Files are uploaded as private ("authenticated") assets. API responses do not contain a Cloudinary link.
They contain a stable path such as `/api/files/:userId/image`. That path does not expire. Each open
checks that the caller is the owner, an admin, or currently mutually accepted with the owner, then
the server reads the file with a short-lived Cloudinary download URL and streams the bytes.
A decline removes that access on the next open. A copy already saved or cached by the other person
cannot be taken back. The short-lived storage URL is not returned to the client.

## Access Control

Until both sides have an accepted interest, suggestions, incoming and outgoing interests, and another user's profile omit name, email, photo URL, resume URL, and other contact or identity details. They do include age, height, community (`ethnicity`), residence (`city`), occupation, the free-text description, the learning institution (`yeshiva`, `seminar`), and the stored money figures: `financialRequirement` (דרישה כספית, a minimum demand), `financialCapabilities` (יכולת כספית; there is no separate השתתפות כספית field), and `financialStatus` (the numeric preference scale).

After mutual approval, name, email, and the stable photo and resume paths are included. If both users send interest at the same time, that is mutual approval (`accepted`), not a conflict. Either person can decline a pending or an accepted interest. A decline is final: it is not overwritten by a later accept, and name, email, photo, and resume are no longer returned.

The national ID number is still returned only to the user themselves and to admins.

`GET /api/profile/:userId` is limited to the profile owner, an admin, a logged-in user for whom that person is a current suggestion, or a pair with a still-pending or accepted interest. A declined pair, anyone else, and an unknown id get the same not-found response. A request without a login token is rejected as unauthorized.

Photo and resume bytes are served only from `GET /api/files/:userId/image` and `GET /api/files/:userId/resume`, and only to the owner, an admin, or a pair whose interest is accepted at the moment of the request. An unknown file and a caller who is not allowed get the same not-found response.

## Security

- Login: max 20 failed attempts per IP address and 10 per account in 15 minutes. Register: 10 per hour per IP address. These limits are off when `NODE_ENV` is `development` or `test` (`npm run dev` and `npm test`). They are on otherwise.
- Passwords are hashed with bcrypt and never returned by queries.
- Every request re-checks that the user still exists and uses their current role.
- Only known fields are accepted from requests; IDs are validated before use in queries.
- Security headers (helmet), CORS restricted to the client's sites, request bodies limited to 100kb.
- Unexpected errors are logged on the server; the client gets a generic message.
