const buttons = document.querySelectorAll(".cancelButton");

buttons.forEach(button => {
    
    button.addEventListener("click", async (event) => {
        event.preventDefault();
        let infoDiv = event.target.parentElement.children['infoDiv'].dataset;
        let datum = infoDiv.datum;
        let id = infoDiv.id;
        
        const payload = {
            datum: datum,
            id: id
        };
        console.log(payload);
        const url = `/terrain/cancel/${id}`
        console.log("tu")
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