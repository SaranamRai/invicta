# INVICTA Sports Management System

This repository keeps one Express/MongoDB backend and supports two separate Next.js frontend deployments from the same source tree.

## Frontend Deployments

Public website:

```env
NEXT_PUBLIC_APP_TYPE=public
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
```

Portal dashboard:

```env
NEXT_PUBLIC_APP_TYPE=portal
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
```

The public deployment blocks login and dashboard routes. The portal deployment redirects `/` to `/login` and blocks public website pages. Both deployments call the same backend API and use the same MongoDB database through that backend.

## Backend Environment

```env
MONGO_URI=your_existing_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
CLIENT_PUBLIC_URL=https://invicta-public.vercel.app
CLIENT_PORTAL_URL=https://invicta-portal.vercel.app
LOCAL_PUBLIC_URL=http://localhost:5173
LOCAL_PORTAL_URL=http://localhost:5174
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email
SMTP_PASS=your_app_password
NODE_ENV=production
```

Do not put MongoDB, SMTP, or JWT secrets in frontend environment variables.

## Getting Started

First, run the development server:

```bash
npm run dev
npm run dev:api
npm run dev:public
npm run dev:portal
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

For two local frontend ports, open `http://localhost:5173` for public and `http://localhost:5174` for portal.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
