# SmartMatch - Project Instructions

## תיאור הפרויקט

SmartMatch היא מערכת Full Stack לחיבור ותיאום בין משתמשים.

המערכת מאפשרת:
- הרשמה והתחברות
- יצירת פרופיל אישי
- הגדרת העדפות חיפוש
- הצגת התאמות לפי קריטריונים
- שליחת התעניינות
- אישור או דחייה של התעניינות
- פתיחת גישה לקבצים לאחר אישור הדדי
- מעבר לטיפול מנהל לאחר בקשה של שני הצדדים

---

# תפקידים

## משתמש רגיל
- נרשם ומתחבר למערכת
- מנהל פרופיל אישי
- מגדיר העדפות חיפוש
- רואה הצעות מתאימות בלבד
- שולח בקשות התעניינות
- מקבל בקשות התעניינות
-(הקבצים שאליהם ניתנת גישה רק לאחר אישור הדדי: קובץ PDF - קורות חיים. קובץ מסוג תמונה) לאחר אישור הדדי מקבל גישה לקבצי הצד השני
- לאחר אישור הדדי יכול ללחוץ על "העבר לטיפול מנהל"

## מנהל
- רואה את כל המשתמשים
- רואה פרטים מלאים וקבצים
- רואה רק התאמות שבהן שני הצדדים ביקשו לעבור לטיפול מנהל
- אינו רואה התעניינויות רגילות
- יכול להסיר התאמה מרשימת הטיפול לאחר שטיפל בה

---

# טכנולוגיות

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB
- Authentication: JWT
- File Upload: Multer
- Supported files: PDF + image

---

# מבנה שרת

```text
server/
  app.js
  server.js

  src/
    models/
      user.model.js
      profile.model.js
      preference.model.js
      interest.model.js

    controllers/
      auth.controller.js
      profile.controller.js
      preference.controller.js
      interest.controller.js
      admin.controller.js

    services/
      auth.service.js
      profile.service.js
      preference.service.js
      interest.service.js
      match.service.js

    routes/
      auth.routes.js
      profile.routes.js
      preference.routes.js
      interest.routes.js
      admin.routes.js

    middleware/
      auth.middleware.js
      error.middleware.js
      upload.middleware.js

    config/
      db.js
      jwt.js
מודלים
User
name
id
password - hashed
role - user/admin
Profile
user - ref User

gender
age
city
height
style
appearance
financialAmount

description

resumePdf
image
Preference
user - ref User

ageMin
ageMax

city

heightMin
heightMax

style

preferredAppearance

financialMin
financialMax
Interest
sender - ref User
receiver - ref User

status:
- pending
- accepted
- rejected

senderApprovedToManager - Boolean, default false
לוגיקת התאמות

המערכת מיועדת להתאמות בין משתמשים ממין שונה בלבד.

לכן:

המשתמש אינו בוחר preferredGender
המערכת מזהה אוטומטית את gender מתוך Profile
בזמן חישוב התאמות:
אם המשתמש הוא male → יוצגו רק female
אם המשתמש הוא female → יוצגו רק male

המערכת מחשבת התאמה דו־כיוונית:

המשתמש מתאים להעדפות של הצד השני
והצד השני מתאים להעדפות של המשתמש
זרימת משתמש
משתמש נרשם ומתחבר.
המשתמש יוצר פרופיל אישי.
המשתמש מגדיר העדפות חיפוש.
המערכת מציגה התאמות מתאימות בלבד.
המשתמש שולח התעניינות.
המשתמש השני רואה התעניינות ממתינה.
אם המשתמש השני דוחה:
status = rejected
אם המשתמש השני מאשר:
status = accepted
שני הצדדים מקבלים גישה לקבצים
לאחר אישור הדדי:
כל צד יכול ללחוץ "העבר לטיפול מנהל"
רק אם שני הצדדים לחצו:
ההתאמה מופיעה באזור "הצעות ממתינות לטיפול"
לאחר שהמנהל טיפל:
הוא יכול להסיר את ההתאמה מרשימת הטיפול
הרשאות
כל Protected Routes דורשים JWT Authentication.
משתמש רגיל רואה רק התאמות שמתאימות לו.
משתמש רגיל רואה רק פרטים בסיסיים לפני אישור הדדי.
קבצים מוצגים רק לאחר אישור הדדי או למנהל.
מנהל רואה את כל המשתמשים והקבצים.
מנהל אינו רואה התעניינויות רגילות.
מנהל רואה רק התאמות ששני הצדדים ביקשו להעביר לטיפול.
עקרונות פיתוח
Controller אחראי על request/response.
Service אחראי על business logic.
Model אחראי על MongoDB.
כל matching logic מתבצע בשרת.
שכבת Service משמשת לעסקי logic מורכב.
אין שימוש ב-discriminator pattern.
אין מודלים כפולים.
CRUD פשוט וברור.
API routes פשוטים וישירים.
קוד קריא וקל להרחבה עתידית.