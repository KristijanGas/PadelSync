const express = require('express');
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();


router.post("/", async (req, res) => {
  const { sellerStripeAccountId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
        //treba dohvatiti cijenu inace
      amount: 500, // €5 in cents
      currency: "eur",
      payment_method_types: ["card"],

      // Send money to seller
      transfer_data: {
        destination: sellerStripeAccountId,
      },

      // OPTIONAL: your platform fee (example: €1)
      // application_fee_amount: 100,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;