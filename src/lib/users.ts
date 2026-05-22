// User list — edit this file to add/remove users
// To generate a new password hash run:
//   node -e "const b=require('bcryptjs'); console.log(b.hashSync('YOUR_PASSWORD', 10))"
//
// access: list of allowed dashboards ('cocabo', 'xoco') or ['*'] for all

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  access: string[]
}

export const USERS: User[] = [
  {
    id: '1',
    email: 'admin@earthsurveillance.com',
    name: 'ES Admin',
    passwordHash: '$2b$10$7fRsDyB/cUn9OUZdo51kFuLa5fHXodsvDcHaZ6/rV2GDlJceLz.TG', // es2026admin
    access: ['*'],
  },
  {
    id: '2',
    email: 'cocabo@earthsurveillance.com',
    name: 'COCABO',
    passwordHash: '$2b$10$AngY2vL/0VdAcusBNRVTS.BJgaVjXXgvnN.1mMWXW7CgYI9RJ.w4O', // cocabo2026
    access: ['cocabo'],
  },
  {
    id: '3',
    email: 'xoco@earthsurveillance.com',
    name: 'Xoco Gourmet',
    passwordHash: '$2b$10$AjlkvngBnJngdPOTqxLwZukLenpj66P7FJCEOJpRGk6b0C9cMUf9m', // xoco2026
    access: ['xoco'],
  },
]

export function findUser(email: string): User | undefined {
  return USERS.find(u => u.email.toLowerCase() === email.toLowerCase())
}

export function canAccess(user: User, dashboard: string): boolean {
  return user.access.includes('*') || user.access.includes(dashboard)
}
