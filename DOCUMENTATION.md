# 📚 תיעוד מלא - פרויקט SmartMatch

## 🎯 מה זה הפרויקט?
**SmartMatch** - אתר שידוכים. משתמשים נרשמים, יוצרים פרופיל, מגדירים העדפות, ומוצאים התאמות.

---

## 🏗️ ארכיטקטורה

```
SmartMatch/
├── client/          ← React (ממשק משתמש)
├── server/          ← Node.js + Express (API)
└── MongoDB          ← מסד נתונים (ענן)
```

**זרימה:**
```
דפדפן → HTTP Request → Express → MongoDB → Response → דפדפן
```

---

## 📦 ספריות - SERVER

| ספרייה | תפקיד | דוגמה |
|--------|-------|-------|
| **express** | שרת HTTP | `app.get('/api/users')` |
| **mongoose** | מתקשר עם MongoDB | `User.findOne({ email })` |
| **bcrypt** | מצפין סיסמאות | `bcrypt.hash(password, 12)` |
| **jsonwebtoken** | יוצר טוקנים לאימות | `jwt.sign({ userId })` |
| **cors** | מאפשר לקליינט לדבר עם סרבר | `app.use(cors())` |
| **multer** | מעלה קבצים | `upload.single('image')` |
| **dotenv** | קורא משתני סביבה | `process.env.MONGO_URI` |

---

## 📦 ספריות - CLIENT

| ספרייה | תפקיד | דוגמה |
|--------|-------|-------|
| **react** | בונה ממשק משתמש | `<LoginForm />` |
| **react-router-dom** | ניווט בין דפים | `<Route path="/login">` |
| **react-hook-form** | מנהל טפסים | `useForm()` |
| **axios** | שולח בקשות HTTP | `axios.post('/api/login')` |
| **vite** | כלי פיתוח מהיר | `npm run dev` |

---

## 🗂️ מבנה SERVER

```
server/
├── app.js                    ← הגדרת Express
├── server.js                 ← התחלת שרת + MongoDB
├── .env                      ← סודות (MONGO_URI, JWT_SECRET)
│
├── src/
│   ├── models/               ← מבנה נתונים
│   │   ├── user.model.js     ← name, email, password
│   │   ├── profile.model.js  ← gender, age, city
│   │   └── preference.model.js ← ageMin, ageMax
│   │
│   ├── controllers/          ← לוגיקה עסקית
│   │   ├── auth.controller.js     ← register, login
│   │   ├── profile.controller.js  ← createProfile, updateProfile
│   │   └── preference.controller.js
│   │
│   ├── services/             ← פונקציות DB
│   │   ├── profile.service.js
│   │   └── preference.service.js
│   │
│   ├── routes/               ← נתיבי API
│   │   ├── auth.routes.js         ← POST /api/auth/register
│   │   ├── profile.routes.js      ← GET /api/profile/me
│   │   └── preference.routes.js
│   │
│   └── middleware/
│       ├── auth.middleware.js     ← בדיקת token
│       └── upload.middleware.js   ← העלאת קבצים
│
└── uploads/
    ├── images/
    └── pdfs/
```

---

## 🗂️ מבנה CLIENT

```
client/
├── src/
│   ├── main.jsx             ← נקודת כניסה
│   ├── App.jsx              ← קומפוננטה ראשית
│   │
│   ├── pages/               ← דפים
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── PreferencesPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── PersonalAreaPage.jsx
│   │
│   ├── components/forms/    ← טפסים
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   │   ├── PreferencesForm.jsx
│   │   └── ProfileForm.jsx
│   │
│   ├── services/            ← קריאות API
│   │   ├── auth.service.js       ← login(), register()
│   │   ├── profile.service.js    ← getMyProfile()
│   │   └── preference.service.js
│   │
│   ├── api/
│   │   └── axios.js         ← הגדרת axios + token
│   │
│   └── utils/
│       └── registrationDraft.js ← שמירת draft
```

---

## 🔄 זרימה: התחברות

### 1. משתמש ממלא טופס
```jsx
LoginPage.jsx → LoginForm.jsx
```

### 2. לחיצה על כפתור
```jsx
const onSubmit = async (data) => {
  const res = await loginUser(data);
}
```

### 3. Service שולח לסרבר
```js
// auth.service.js
export const login = (data) => {
  return api.post("/auth/login", data);
}
```

### 4. axios מוסיף token
```js
// axios.js
config.headers.Authorization = `Bearer ${token}`;
```

### 5. Express מקבל
```js
// auth.routes.js
router.post("/login", login);
```

### 6. Controller מעבד
```js
// auth.controller.js
const user = await User.findOne({ email });
const isValid = await bcrypt.compare(password, user.password);
const token = jwt.sign({ userId: user._id });
res.json({ token, user });
```

### 7. תשובה חוזרת
```js
localStorage.setItem("token", token);
navigate("/personal-area");
```

---

## 🗄️ MongoDB Collections

### users
```js
{
  name: "חנה כהן",
  idNumber: "327824552",
  email: "hana@gmail.com",
  password: "$2b$12$...", // מוצפן
  role: "user"
}
```

### profiles
```js
{
  user: ObjectId,
  gender: "female",
  age: 25,
  city: "ירושלים",
  height: 165,
  style: "modern",
  seminar: "בית יעקב",
  image: "images/456.jpg"
}
```

### preferences
```js
{
  user: ObjectId,
  ageMin: 23,
  ageMax: 30,
  heightMin: 170,
  heightMax: 185,
  style: "modern"
}
```

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` - הרשמה
- `POST /api/auth/login` - התחברות
- `GET /api/auth/me` - פרטי משתמש

### Profile
- `POST /api/profile/` - יצירת פרופיל
- `GET /api/profile/me` - קבלת פרופיל
- `PUT /api/profile/` - עדכון פרופיל

### Preference
- `POST /api/preference/` - יצירת העדפות
- `GET /api/preference/me` - קבלת העדפות
- `PUT /api/preference/` - עדכון העדפות

---

## 🔐 אבטחה

### הרשמה
```
1. משתמש שולח: { email, password }
2. bcrypt מצפין סיסמה
3. MongoDB שומר: password: "$2b$12$..."
4. jwt יוצר token
```

### התחברות
```
1. משתמש שולח: { email, password }
2. bcrypt משווה סיסמאות
3. jwt יוצר token
4. קליינט שומר ב-localStorage
```

### בקשות מאומתות
```
1. axios מוסיף: Authorization: Bearer <token>
2. middleware בודק token
3. jwt מפענח → userId
4. controller משתמש ב-userId
```

---

## 🚀 הרצה

### התקנה
```bash
cd server && npm install
cd client && npm install
```

### הרצה
```bash
# Terminal 1
cd server && npm start

# Terminal 2
cd client && npm run dev
```

---

## 🐛 בעיות נפוצות

### 400 - "All required fields must be filled"
- בדוק console.log בסרבר
- וודא שכל השדות נשלחים

### 401 - "Unauthorized"
- בדוק localStorage.getItem('token')
- token לא תקף

### 404 - "Not Found"
- הסרבר לא רץ
- נתיב שגוי

### CORS Error
- וודא app.use(cors()) ב-app.js

---

## 📝 תהליך הרשמה

```
1. RegisterForm → שמירה ב-sessionStorage
2. PreferencesForm → קריאה מ-sessionStorage
3. completeRegistration():
   ├─ POST /api/auth/register
   ├─ POST /api/profile/
   └─ POST /api/preference/
4. navigate('/login')
```

---

## ✅ Checklist

- [ ] React מציג דף (Component → JSX)
- [ ] axios שולח בקשה
- [ ] Express מקבל ומחזיר
- [ ] Mongoose שומר ב-MongoDB
- [ ] JWT מאמת משתמשים
- [ ] bcrypt מצפין סיסמאות

---

**סיכום:** Full Stack - שליטה מלאה על Frontend, Backend, Database
