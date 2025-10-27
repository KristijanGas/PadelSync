
const addedPhotos = document.getElementById("slike");
const photosContainer = document.getElementById("photosContainer");
const form = document.getElementById("terrainInfo");

let selectedFiles = [];
let eraseFiles = [];

//this will display images as they are being added
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



//this will dispaly already added, older images
function displayImages(){
        const terrainPhotos = JSON.parse(photosContainer.dataset.terrainPhotos);
        console.log(terrainPhotos);
        for(const photoId of terrainPhotos){
                const img = document.createElement("img");
                img.src = `photo/${photoId}`;
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


form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        selectedFiles.forEach((file) => formData.append("slike", file));
        console.log("from forntend: ", eraseFiles);
        formData.append('erasePhotos[]', '');
        eraseFiles.forEach(photoId => formData.append('erasePhotos[]', photoId));
        let res;
        res = await fetch("../insertTerrainInfo", {
        method: "POST",
        body: formData
        })

        if(res.ok){
                const data = await res.json();
                if(data.redirectURL){
                        window.location.href = data.redirectURL;
                }
        }else{
                console.log("error submitting form");
        }
})


displayImages();