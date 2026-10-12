# SmartMatch Server

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/smartmatch
JWT_SECRET=your_secret_key
PORT=3000
```

## Running the Server

```bash
npm start
```

The server will run on http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Profile
- `POST /api/profile` - Create profile (with Multer file upload)
- `GET /api/profile/me` - Get own profile
- `GET /api/profile/:userId` - Get other user's profile (access control applies)
- `PUT /api/profile` - Update profile (with Multer file upload)
- `DELETE /api/profile` - Delete profile

### Preference
- `POST /api/preference` - Create preferences
- `GET /api/preference/me` - Get preferences
- `PUT /api/preference` - Update preferences

### Interest
- `POST /api/interest` - Send interest to user
- `GET /api/interest/incoming` - Get incoming interests
- `GET /api/interest/outgoing` - Get outgoing interests
- `PUT /api/interest/respond` - Respond to interest (accept/reject)
- `POST /api/interest/send-to-manager` - Approve interest to send to manager

### Match
- `GET /api/match` - Get mutual matches
- `GET /api/match/candidates` - Get candidate matches based on preferences

### Admin
- `GET /api/admin/pending-matches` - Get pending matches (admin only)
- `DELETE /api/admin/pending-match` - Remove pending match (admin only)
- `GET /api/admin/users` - Get all users (admin only)

## File Upload

Files are uploaded to the `/uploads` directory and served via `/uploads` endpoint.
- Supported image formats: JPEG, PNG
- Supported PDF format: PDF
- Maximum file size: 5MB

## Access Control

Profile files (resumePdf, image) are only visible to:
1. The profile owner (admin or user themselves)
2. Users with whom there is a mutual accepted interest
3. Admin users

## Error Handling

The server includes comprehensive error handling for:
- Multer file upload errors
- Mongoose validation errors
- JWT token errors
- Duplicate key errors
- Invalid ID format errors
