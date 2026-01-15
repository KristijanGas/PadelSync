const messages = document.querySelectorAll(".messageTitle");


messages.forEach(message =>{
    message.addEventListener("click", async () => {
        const url = `/socket/read/${message.id}`;
        const res = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        //lara treba dodati "proširenje obavijesti tu"
    })
})