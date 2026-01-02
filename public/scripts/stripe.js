//hard coded
const stripe = Stripe("pk_test_51Sk4IwQ4PgDXFluNoEkiPuVvzBF525t5SiM8B3ufYWM1OV8UsE3TIkbccvPGiEU0gxlNNka6FdxIwBCLuYJXRnBd00OYJsDy0s"); // your PUBLIC key


const elements = stripe.elements();


const cardElement = elements.create("card");
cardElement.mount("#card-element");


const form = document.getElementById("payment-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const response = await fetch("/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        //hardcoded for testing
      sellerStripeAccountId: "acct_1Sk92WLeRsFH1ywa",
    }),
  });
  const { clientSecret } = await response.json();

  const result = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
    },
  });
  console.log(result);
  if (result.error) {
    document.getElementById("error-message").textContent =
      result.error.message;
  } else if (result.paymentIntent.status === "succeeded") {
    console.log(result)
    alert("Payment successful!");
  }
});
