const addedPhotos = document.getElementById("slike");
const photosContainer = document.getElementById("photosContainer");
const form = document.getElementById("clubInfo");
const currentUrl = window.location.href;

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
if(form){
        form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        selectedFiles.forEach((file) => formData.append("slike", file));
        formData.append('erasePhotos[]', '');
        eraseFiles.forEach(photoId => formData.append('erasePhotos[]', photoId));
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
        }else{
                console.log("error submitting form");
        }
        })
}




displayImages();