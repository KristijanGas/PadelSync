const form = document.getElementById("terrainSearchForm");
form.addEventListener("submit", function(e) {
    const udaljenost = document.getElementById("udaljenost").value;
    const latInput = document.getElementById("userLat");
    const longInput = document.getElementById("userLong");

    if (udaljenost && parseFloat(udaljenost) > 0) {
        e.preventDefault(); // spriječi automatski submit dok ne dobijemo koordinate

        navigator.geolocation.getCurrentPosition(
            (position) => {
                latInput.value = position.coords.latitude;
                longInput.value = position.coords.longitude;
                form.submit(); // sada forma ide na backend sa koord.
            },
            (error) => {
                console.error(error);
                // fallback: pošalji formu bez koordinata
                form.submit();
            }
        );
    }
});
