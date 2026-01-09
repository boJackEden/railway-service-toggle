# 🚂 Railway Control Dashboard

> *"We heard you like deployment dashboards so we build a deployment dashboard for your deployment dashboard" - Xzibit*

A Next.js-powered control panel for managing Railway instances. 

## What's This?

A dashboard that lets you:
- Start, stop, and restart Railway service instances (as long as they are already started)
- View deployment logs in real-time (or as real-time as HTTP polling gets)
- Monitor instance states with live updates

## Running Locally

```bash
# Install dependencies
npm install

# build the thang
npm run build

# Fire up Next
npm run start
```

## Environment Variables

The only thing I put in there was the railway gql endpoint. so add this to a .env.local

RAILWAY_GQL_ENDPOINT=https://backboard.railway.com/graphql/v2

---

*Made with ☕ and a dream of working at Railway*
