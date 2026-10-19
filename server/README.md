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
| `SMTP_HOST` | for reset email | SMTP hostname. If this or `MAIL_FROM` is empty, a reset request still succeeds. Outside production the reset link is printed in the server log. In production the server logs a warning and does not send mail. |
| `SMTP_PORT` | no | Default `587`. Port `465` uses implicit TLS. |
| `SMTP_USER` | no | SMTP username, when the server requires authentication |
| `SMTP_PASS` | no | SMTP password, when the server requires authentication |
| `MAIL_FROM` | for reset email | From address, for example `בית נאמן <no-reply@example.com>` |
| `CLIENT_URL` | for reset email | Site origin used in the reset link, such as `http://localhost:5173`. Outside production, an empty value falls back to `http://localhost:5173` for the logged link. |

The server refuses to start without `MONGO_URI` and `JWT_SECRET`, or when the database can't be reached.
Without `CLOUDINARY_URL` it starts, but file uploads return 503.

## Running the Server

```bash
npm start      # rate limits on (NODE_ENV is not development or test)
npm run dev    # restarts on file changes; sets NODE_ENV=development so auth rate limits are off
```

`npm run dev` is the local start. It sets `NODE_ENV=development`, which turns the login, register, and password-reset rate limits off so retries while testing do not lock an account. `npm test` sets `NODE_ENV=test` and does the same. Any other value, including leaving `NODE_ENV` unset, keeps those limits on.

The server will run on http://localhost:3000

## ID numbers

Accounts do not store a national ID. From the `server` directory, with `MONGO_URI` in `.env`:

```bash
npm run fix:idNumberIndex
```

The script drops every `users` index whose key is exactly `{ idNumber: 1 }` (including `idNumber_1`, whatever its options) and unsets `idNumber` on existing users. It is safe to run again. `npm run migrate:idNumber` does not copy an ID; it prints that IDs are not stored and exits.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Ask for a password reset link. The reply is the same whether or not the account exists.
- `POST /api/auth/reset-password` - Set a new password with the single-use token from that link.
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

A phone number is returned only to the account owner, on their own settings, and to an admin. It is not included in another user's suggestion, profile, search, or notification, including after mutual approval.

National ID numbers are not stored. A leftover `idNumber` on an old document is omitted from API responses.

`GET /api/profile/:userId` is limited to the profile owner, an admin, a logged-in user for whom that person is a current suggestion, or a pair with a still-pending or accepted interest. A declined pair, anyone else, and an unknown id get the same not-found response. A request without a login token is rejected as unauthorized.

Photo and resume bytes are served only from `GET /api/files/:userId/image` and `GET /api/files/:userId/resume`, and only to the owner, an admin, or a pair whose interest is accepted at the moment of the request. An unknown file and a caller who is not allowed get the same not-found response.

## Matching

Suggestions compare structured fields only: age, height, city, marital status, style, appearance, ethnicity, yeshiva, seminar, and the numeric money fields. The free-text description, what the person is looking for, `financialRequirement`, and `financialCapabilities` are stored and shown, and are not compared. There is no AI score.

A missing candidate value is unknown. It does not remove the person, and it is left out of the match percent. When nothing can be compared, the percent is null rather than 100.

City, yeshiva, and seminar are compared after trimming, lowercasing, and treating a hyphen, dash, or Hebrew maqaf as a space. An empty preference does not filter.

Money follows one rule for both stored number shapes. Neither shape deletes the other. `financialParticipation` must meet `financialDemand` when both numbers exist. `financialStatus` must sit inside `[financialMin, financialMax]` when the status and a bound exist. A missing number skips that check. Below a demand, or outside the range, removes the person. The percent uses the same skips: 70 when participation equals the demand and 100 at twice the demand, and the same edge-to-middle closeness as age for the status range.

`GET /api/match/candidates` and `GET /api/suggestions` include `hiddenByPreference`: how many people the viewer's own filters removed, with a count per filter. The object is only numbers. The list is ordered by match percent, highest first. A person with no percent sorts last. `Profile.gender` is indexed because suggestions are looked up by gender.

Admin suggestions, cases, and new pairs use this same percent. Free text is not part of it.

## Security

- Login: max 20 failed attempts per IP address and 10 per account in 15 minutes. Register: 10 per hour per IP address. Password reset requests: 5 per 15 minutes per IP address. These limits are off when `NODE_ENV` is `development` or `test` (`npm run dev` and `npm test`). They are on otherwise.
- Passwords are hashed with bcrypt and never returned by queries. A reset email contains a random token, not the password. Only a SHA-256 hash of the token is stored. The link expires after one hour, after it is used, and when a newer link is requested. The API response never includes the token. Setting a new password increases `tokenVersion`, so older login sessions stop working.
- Every request re-checks that the user still exists and uses their current role.
- Only known fields are accepted from requests; IDs are validated before use in queries.
- Security headers (helmet), CORS restricted to the client's sites, request bodies limited to 100kb.
- Unexpected errors are logged on the server; the client gets a generic message.
