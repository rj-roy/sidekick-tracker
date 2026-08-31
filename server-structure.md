# mail-tracker-server Structure

```
mail-tracker-server/
│
├── src/
│   │
│   ├── app.ts
│   ├── server.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── cors.ts
│   │   ├── logger.ts
│   │   ├── rate-limit.ts
│   │   └── index.ts
│   │
│   ├── database/
│   │   ├── mongodb.ts
│   │   ├── initialize-indexes.ts
│   │   └── index.ts
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.validation.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── users/
│   │   │   ├── user.model.ts
│   │   │   ├── user.index.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.repository.ts
│   │   │   ├── user.validation.ts
│   │   │   ├── user.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── mailboxes/
│   │   │   ├── mailbox.model.ts
│   │   │   ├── mailbox.index.ts
│   │   │   ├── mailbox.controller.ts
│   │   │   ├── mailbox.service.ts
│   │   │   ├── mailbox.repository.ts
│   │   │   ├── mailbox.validation.ts
│   │   │   ├── mailbox.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── emails/
│   │   │   ├── email.model.ts
│   │   │   ├── email.index.ts
│   │   │   ├── email.controller.ts
│   │   │   ├── email.service.ts
│   │   │   ├── email.repository.ts
│   │   │   ├── email.validation.ts
│   │   │   ├── email.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── tracking/
│   │   │   ├── tracking.model.ts
│   │   │   ├── tracking.index.ts
│   │   │   ├── tracking.controller.ts
│   │   │   ├── tracking.service.ts
│   │   │   ├── tracking.repository.ts
│   │   │   ├── tracking.validation.ts
│   │   │   ├── tracking.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── tracking-links/
│   │   │   ├── tracking-link.model.ts
│   │   │   ├── tracking-link.index.ts
│   │   │   ├── tracking-link.controller.ts
│   │   │   ├── tracking-link.service.ts
│   │   │   ├── tracking-link.repository.ts
│   │   │   ├── tracking-link.validation.ts
│   │   │   ├── tracking-link.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── attachments/
│   │   │   ├── attachment.model.ts
│   │   │   ├── attachment.index.ts
│   │   │   ├── attachment.controller.ts
│   │   │   ├── attachment.service.ts
│   │   │   ├── attachment.repository.ts
│   │   │   ├── attachment.validation.ts
│   │   │   ├── attachment.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── subscriptions/
│   │   │   ├── subscription.model.ts
│   │   │   ├── subscription.index.ts
│   │   │   ├── subscription.controller.ts
│   │   │   ├── subscription.service.ts
│   │   │   ├── subscription.repository.ts
│   │   │   ├── subscription.validation.ts
│   │   │   ├── subscription.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── payments/
│   │   │   ├── payment.model.ts
│   │   │   ├── payment.index.ts
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── payment.repository.ts
│   │   │   ├── payment.validation.ts
│   │   │   ├── payment.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   └── webhooks/
│   │       ├── webhook.controller.ts
│   │       ├── webhook.service.ts
│   │       ├── webhook.validation.ts
│   │       ├── webhook.routes.ts
│   │       └── index.ts
│   │
│   ├── integrations/
│   │   │
│   │   ├── google/
│   │   │   ├── google.ts
│   │   │   ├── google-oauth.service.ts
│   │   │   └── gmail.service.ts
│   │   │
│   │   ├── microsoft/
│   │   │   ├── microsoft.ts
│   │   │   ├── microsoft-oauth.service.ts
│   │   │   └── outlook.service.ts
│   │   │
│   │   ├── stripe/
│   │   │   ├── stripe.ts
│   │   │   ├── stripe.service.ts
│   │   │   └── stripe.webhook.ts
│   │   │
│   │   ├── cloudinary/
│   │   │   ├── cloudinary.ts
│   │   │   └── cloudinary.service.ts
│   │   │
│   │   └── email/
│   │       ├── email.ts
│   │       └── email.service.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── extension-auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── not-found.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── upload.middleware.ts
│   │
│   ├── routes/
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── express.d.ts
│   │   ├── auth.types.ts
│   │   ├── email.types.ts
│   │   ├── tracking.types.ts
│   │   ├── stripe.types.ts
│   │   ├── extension.types.ts
│   │   └── common.types.ts
│   │
│   ├── utils/
│   │   ├── api-error.ts
│   │   ├── api-response.ts
│   │   ├── async-handler.ts
│   │   ├── pagination.ts
│   │   ├── crypto.ts
│   │   ├── hash.ts
│   │   └── date.ts
│   │
│   ├── constants/
│   │   ├── http-status.ts
│   │   ├── messages.ts
│   │   ├── roles.ts
│   │   ├── plans.ts
│   │   ├── tracking-events.ts
│   │   └── subscription-status.ts
│   │
│   └── jobs/
│       ├── cleanup-tracking-events.job.ts
│       ├── subscription-sync.job.ts
│       └── email-processing.job.ts
│
├── tests/
│   ├── unit/
│   │   ├── auth/
│   │   ├── tracking/
│   │   ├── emails/
│   │   └── subscriptions/
│   │
│   └── integration/
│       ├── auth/
│       ├── emails/
│       ├── tracking/
│       ├── payments/
│       └── webhooks/
│
├── scripts/
│   ├── create-indexes.ts
│   ├── seed.ts
│   └── cleanup.ts
│
├── .env
├── .env.example
├── .gitignore
├── eslint.config.js
├── prettier.config.js
├── tsconfig.json
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```
