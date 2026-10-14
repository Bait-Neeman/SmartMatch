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
npm start      # production
npm run dev    # restarts on file changes
```

The server will run on http://localhost:3000

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
- `PUT /api/interest/respond` - Respond to interest (accept/reject)
- `POST /api/interest/send-to-manager` - Approve interest to send to manager

### Match
- `GET /api/match` - Get mutual matches
- `GET /api/match/candidates` - Get candidate matches based on preferences

### Admin (admin role only)
- `GET /api/admin/pending-matches` - Get pending matches
- `DELETE /api/admin/pending-match` - Remove pending match
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:userId/profile` - Get a user's profile

## File Upload

Files are stored only in Cloudinary - never on the server's disk.
- Image (`image`): JPEG, PNG, GIF or WEBP. Large photos are resized to 1600px and their metadata (e.g. GPS location) is removed.
- Resume (`resumePdf`): PDF
- Maximum file size: 10MB
- The real file type is checked from the file's content, not only from the type the browser declares.

Files are uploaded as private ("authenticated") assets. The API never returns a permanent public address;
it returns a signed URL, and only to users who may see the file.
Resumes are opened through Cloudinary's signed download API (free accounts block CDN delivery of PDFs);
those links expire after one hour.

## Access Control

Profile files (resumePdf, image) are only visible to:
1. The profile owner
2. Users with whom there is a mutual accepted interest
3. Admin users

Users see each other by name only - ID numbers are returned only to the user themselves and to admins.

## Security

- Login: max 20 failed attempts per IP address and 10 per account in 15 minutes. Register: 10 per hour per IP address.
- Passwords are hashed with bcrypt and never returned by queries.
- Every request re-checks that the user still exists and uses their current role.
- Only known fields are accepted from requests; IDs are validated before use in queries.
- Security headers (helmet), CORS restricted to the client's sites, request bodies limited to 100kb.
- Unexpected errors are logged on the server; the client gets a generic message.
