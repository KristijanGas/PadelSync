const addedPhotos = document.getElementById("slike");
const photosContainer = document.getElementById("photosContainer");

//this will display images as they are being added
addedPhotos.addEventListener("change", (event) => {
        console.log("Here");
        console.log(event.target.files);
        const files = event.target.files;
        for(const file of files){
                const img = document.createElement("img");
                img.src = URL.createObjectURL(file);
                img.style.height = "50px";
                photosContainer.appendChild(img);
        }
});

//this will dispaly already added, older images
function displayImages(){
        if(!photosContainer){
                //assume its a player, they have no photos. otherwise a club
                return;
        }
        const clubPhotos = JSON.parse(photosContainer.dataset.clubPhotos);
        for(const photoUrl of clubPhotos){
                const img = document.createElement("img");
                img.src = `photo/${photoUrl}`;
                img.style.height = "50px";
                photosContainer.appendChild(img);
        }
}

displayImages();