export class TinyPesaUnavailableError extends Error {
  constructor() {
    super("TinyPesa payment setup is incomplete. Configure its API contract and credentials before accepting payments.");
    this.statusCode = 503;
  }
}

export async function initiateTinyPesaPayment() {
  if (!process.env.TINYPESA_API_URL || !process.env.TINYPESA_API_KEY || !process.env.TINYPESA_CALLBACK_URL) {
    throw new TinyPesaUnavailableError();
  }

  const error = new Error("TinyPesa is configured, but its API request and callback verification are not implemented.");
  error.statusCode = 503;
  throw error;
}
