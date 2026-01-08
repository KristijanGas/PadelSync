const addedPhotos = document.getElementById("slike");
const photosContainer = document.getElementById("photosContainer");
const clubForm = document.getElementById("clubInfo");
const playerForm = document.getElementById("playerInfo");
const currentUrl = window.location.href;
const adresa = document.getElementById("adresaKlub");
const results = document.getElementById("address-results");
let lat = 1000;
let long = 1000;

const mapboxToken = "pk.eyJ1IjoicGFkZWwtc3luYyIsImEiOiJjbWs1dDJyeHowYWU2M2dzOGdxNTBud2x0In0.CnxOxyhcmKh4rhsVwRZt4A"
async function fetchAddresses(query) {
        if (!query) return [];
        if(query.length < 3) return;
        const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
        )}.json?access_token=${mapboxToken}&autocomplete=true&limit=5&country=HR`
        );

        return res.json();
}

let timeout;
if(adresa){
        adresa.addEventListener("input", () => {
                console.log("pisem")
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
        const data = await fetchAddresses(adresa.value);
        console.log(data);
        if(data){
                renderRes(data.features);
        }
        }, 400);
        });
}

function renderRes(features){
        results.innerHTML = "";
        features.forEach((feature) => {
                const li = document.createElement("li");
                li.textContent = feature.place_name;

                li.addEventListener("click", () => {
                        adresa.value = feature.place_name;
                        lat = feature.center[0];
                        long = feature.center[1];
                        results.innerHTML = "";
                })
                results.appendChild(li);
        });
}

let selectedFiles = [];
let eraseFiles = [];
//this will display images as they are being added
if(addedPhotos){
        addedPhotos.addEventListener("change", (event) => {
        const files = event.target.files;
        for(const file of files){
                selectedFiles = selectedFiles.concat(file);
                const img = document.createElement("img");
                img.src = URL.createObjectURL(file);
                img.style.height = "50px";
                const eraseButton = document.createElement("button");
                eraseButton.textContent ="erase this image";
                eraseButton.type = "button";
                eraseButton.addEventListener("click", () => eraseNewPhoto(file, img, eraseButton));
                photosContainer.appendChild(img);
                photosContainer.appendChild(eraseButton);
        }
        addedPhotos.value = "";
});
}


//this will dispaly already added, older images
function displayImages(){
        if(!photosContainer){
                //assume its a player, they have no photos. otherwise a club
                return;
        }
        const clubPhotos = JSON.parse(photosContainer.dataset.clubPhotos);
        for(const photoId of clubPhotos){
                const img = document.createElement("img");
                img.src = `${currentUrl}/photo/${photoId}`;
                img.style.height = "50px";
                img.id = photoId;
                const eraseButton = document.createElement("button");
                eraseButton.textContent ="erase this image";
                eraseButton.type = "button";
                eraseButton.addEventListener("click", () => erasePhoto(photoId, img, eraseButton));
                photosContainer.appendChild(img);
                photosContainer.appendChild(eraseButton);
        }
}

async function erasePhoto(photoId, img, eraseButton){
        eraseButton.remove();
        img.remove();
        eraseFiles = eraseFiles.concat(photoId);
}

function eraseNewPhoto(file, img, button){
        img.remove();
        button.remove();
        selectedFiles = selectedFiles.filter((f) => f !== file);
}
if(clubForm){
        clubForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        /* if(adresa.value){
                const koordinateRes = await fetchAddresses(adresa.value);
                if(!koordinateRes || !koordinateRes.features){
                        alert("Adresa nije dovoljno specificna")
                        return;
                }else if(koordinateRes.features.length === 0){
                        alert("nepostojeća adresa")
                        return;
                }else if(!koordinateRes.features[0].center[0] || !koordinateRes.features[0].center[1]){
                        alert("nepostojeća adresa");
                        return;
                }
        } */
        const formData = new FormData(clubForm);
        selectedFiles.forEach((file) => formData.append("slike", file));
        formData.append('erasePhotos[]', '');
        eraseFiles.forEach(photoId => formData.append('erasePhotos[]', photoId));
        formData.append('lat', lat);
        formData.append('long', long);
        let res;
        res = await fetch(`${currentUrl}/insertClubInfo`, {
        method: "POST",
        body: formData
        })
        if(res.ok){
                const data = await res.json();
                if(data.redirectURL){
                        window.location.href = data.redirectURL;
                }
        }else if(res.status === 400){
                const data = await res.json();
                console.log(data.errors)
                alert(data.errors);
                return;
        }else{
                console.log("error submitting clubForm");
        }
        })
}

if(playerForm){
        playerForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const formData = new FormData(playerForm);
                res = await fetch(`${currentUrl}/insertPlayerInfo`, {
                method: "POST",
                body: formData
                })
        
                if(res.ok){
                        const data = await res.json();
                        if(data.redirectURL){
                                window.location.href = data.redirectURL;
                        }
                }else if(res.status === 400){
                        const data = await res.json();
                        alert(data.errors);
                        return;
                }else{
                        console.log("error submitting playerForm");
                }
        })
}



displayImages();