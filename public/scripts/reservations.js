
const forms = document.querySelectorAll(".formaRezervacije");
const currentUrl = window.location.href;

forms.forEach(form => {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const tipTermina = form.querySelector('[name="tipTermina"]');
        if (!tipTermina || !tipTermina.value) {
            window.alert("Niste odabrali tip terena!")
            return;
        }

        let tipPlacanja;
        const tipPlacanjaInputs = form.querySelectorAll('input[name="tipPlacanja"]');
        if (tipPlacanjaInputs.length > 0) {
             const tipPlacanjaDiv = form.querySelector('input[name="tipPlacanja"]:checked');
            if (!tipPlacanjaDiv) {
                window.alert("Niste odabrali tip plaćanja!");
                return;
            }else{
                tipPlacanja = tipPlacanjaDiv.value
            }
        }else{
            tipPlacanja = "gotovina"
        }
        console.log(tipPlacanja)

        const infoEl = document.getElementById("terminInfo");

        const termin = JSON.parse(infoEl.dataset.termin);
        const teren = JSON.parse(infoEl.dataset.teren);
        console.log(termin)
        
        const payload = {
            tipTermina: tipTermina.value,
            tipPlacanja: tipPlacanja,
            termin: termin,
            teren: teren
        };

        const terminID = termin.terminID
        const url = `/terrain/${terminID}`;
        console.log(url)

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.checkoutUrl) {
            const transakcijaID = data.transakcijaID;
            const checkoutUrl = data.checkoutUrl;

            const url = checkoutUrl.endsWith('/') 
                ? `${checkoutUrl}${transakcijaID}` 
                : `${checkoutUrl}/${transakcijaID}`;

            window.location.href = url;
        } else {
           window.location.href = data.redirect;
        }
    })
});
