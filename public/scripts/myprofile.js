const deleteStripeButton = document.querySelector(".deleteStripe")

if (deleteStripeButton) {
    deleteStripeButton.addEventListener("click", async () => {

        const confirmed = confirm(
            "Are you sure you want to delete your Stripe account?"
        );

        if (!confirmed) return; 

        try {
            const url = "/stripeClub/deleteAccount";
            const res = await fetch(url, {
                method: "GET", 
                headers: { "Content-Type": "application/json" },
            });

            const text = await res.text();
            alert(text);

        } catch (err) {
            console.error(err);
            alert("Something went wrong.");
        }
    });
}