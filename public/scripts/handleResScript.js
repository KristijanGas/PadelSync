const confirmButtons = document.querySelectorAll(".confirmRes");

confirmButtons.forEach(button => {
    button.addEventListener("click", async event => {
        event.preventDefault();
        const infoDiv = event.target.parentElement.children['info'].dataset;
        const datum = infoDiv.datum;
        const id = infoDiv.id;

        const payload = {
            datum: datum,
            id: id
        };

        const url = `/reservationHandle/confirmReservation/${id}`
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const text = await res.text();
            alert(text); 
            return;
        }

        alert("Uspješno otkazana rezervacija");
        location.reload();
    });
});

const rejectButtons = document.querySelectorAll(".rejectRes");

rejectButtons.forEach(button => {
    button.addEventListener("click", async event => {
        event.preventDefault();
        const infoDiv = event.target.parentElement.children['info'].dataset;
        const datum = infoDiv.datum;
        const id = infoDiv.id;

        const payload = {
            datum: datum,
            id: id
        };

        const url = `/reservationHandle/rejectReservation/${id}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const text = await res.text();
            alert(text); 
            return;
        }

        alert("Uspješno otkazana rezervacija");
        location.reload();
    });
});