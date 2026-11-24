const apiUrl = "https://lipaharakaapis.co.ke/api.php?action=api_stk";

export async function initiateHarakaPayment({ amount, phoneNumber }) {
  const apiKey = process.env.LIPAHARAKA_API_KEY;
  const channelId = process.env.LIPAHARAKA_CHANNEL_ID;
  if (!apiKey || !channelId) {
    const error = new Error("HarakaHaraka payment settings are not configured on the server.");
    error.statusCode = 503;
    throw error;
  }

  const body = new URLSearchParams({
    api_key: apiKey,
    phone: phoneNumber,
    amount: String(amount),
    channel_id: channelId
  });
  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "WritersHub/1.0"
      },
      body,
      signal: AbortSignal.timeout(30000)
    });
  } catch (cause) {
    const error = new Error("Could not reach HarakaHaraka. Please try again.");
    error.statusCode = 502;
    error.cause = cause;
    throw error;
  }

  let result;
  try {
    result = await response.json();
  } catch {
    const error = new Error("HarakaHaraka returned an invalid response.");
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok || ![1, true].includes(result?.ok)) {
    const error = new Error(result?.message || "HarakaHaraka could not start the payment.");
    error.statusCode = 502;
    throw error;
  }

  const checkoutRequestId = result.provider?.CheckoutRequestID;
  if (typeof checkoutRequestId !== "string" || !checkoutRequestId) {
    const error = new Error("HarakaHaraka did not return a checkout request ID.");
    error.statusCode = 502;
    throw error;
  }

  return {
    checkoutRequestId,
    merchantRequestId: result.provider.MerchantRequestID || null
  };
}
