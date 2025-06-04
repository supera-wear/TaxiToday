# TaxiToday

## Setup

Install dependencies and start the server:

```bash
npm install
npm start
```

### Environment variables

The server requires the following environment variable:

- `STRIPE_SECRET_KEY` – your Stripe secret API key used to create Checkout sessions.

Optionally, `PORT` can be set to change the listening port (default is `10000`). If `STRIPE_SECRET_KEY` is not provided, the payment endpoint will be disabled and return an error.

### Stripe Checkout

After calculating the booking price, the application requests `/api/create-checkout-session` which creates a Stripe Checkout session and redirects the customer to complete payment.
