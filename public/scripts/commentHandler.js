const form = document.querySelector(".commentForm");
if (form) {
  form.addEventListener("submit", async function(e) {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form)); // convert to object
    const res = await fetch(`${currentUrl}/addComment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    
    const result = await res.json();
    if (res.ok && result.redirect) {
      window.location.href = result.redirect;
    } else if (res.status === 400) {
      alert(result.errors);
    } else {
      console.log("Error submitting comment");
    }
  });
}
