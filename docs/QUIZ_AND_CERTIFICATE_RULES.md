# Quiz and Certificate Rules

- A quiz belongs to a published course and is managed by its approved teacher or an admin.
- Questions store their correct option on the server; student-facing quiz views never include correct answers.
- Default pass mark: 70% of questions correct. Teachers may set a per-quiz pass mark between 0 and 100.
- Default maximum attempts: 5. A student may retry until they pass or reach the limit.
- An attempt is scored server-side by comparing submitted option indexes to stored correct options.
- A certificate is issued only when all of the following are true:
  - The student is enrolled in the course.
  - The student has marked every lesson in the course as completed.
  - The student has a passing quiz attempt.
- Only one certificate is issued per student per course; duplicate issuance is prevented.
- Verification numbers are unique and public verification returns only the student name, course title, and issue date.
