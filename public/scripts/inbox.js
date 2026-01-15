const messages = document.querySelectorAll(".messageTitle");

messages.forEach(message => {
    message.addEventListener("click", async () => {
        const url = `/myInbox/read/${message.id}`;
        const res = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        const content = message.nextElementSibling;

        if (content.style.maxHeight && content.style.maxHeight !== "0px") {
            content.style.maxHeight = "0px";
            content.style.opacity = 0;
            content.style.paddingTop = 0;
            content.style.paddingBottom = 0;
            content.style.marginTop = 0;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
            content.style.opacity = 1;
            content.style.paddingTop = "10px";
            content.style.paddingBottom = "10px";
            content.style.marginTop = "10px";
        }
    });
});
