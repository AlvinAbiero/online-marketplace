import paypal from "paypal-rest-sdk";

paypal.configure({
  mode: process.env.PAYPAL_MODE || "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID!,
  client_secret: process.env.PAYPAL_CLIENT_SECRET!,
});

export interface CreatePaymentData {
  amount: string;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

export const createPayment = (data: CreatePaymentData): Promise<any> => {
  return new Promise((resolve, reject) => {
    const paymentData = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: data.returnUrl,
        cancel_url: data.cancelUrl,
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: data.description,
                sku: "item",
                price: data.amount.toString(),
                currency: data.currency,
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: data.currency,
            total: data.amount.toString(),
          },
          description: data.description,
        },
      ],
    };

    paypal.payment.create(paymentData, (error, payment) => {
      if (error) {
        reject(error);
      } else {
        resolve(payment);
      }
    });
  });
};

export const executePayment = (
  paymentId: string,
  payerId: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const executePaymentJson = {
      payer_id: payerId,
    };

    paypal.payment.execute(paymentId, executePaymentJson, (error, payment) => {
      if (error) {
        reject(error);
      } else {
        resolve(payment);
      }
    });
  });
};
