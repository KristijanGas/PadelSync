const templates = {
    zahtjevZaRezervacijomKlub: (usernamePrimatelj, poslanoZbogUsername, datumRez, vrijemePocetak, vrijemeKraj, terenID, imeTeren) => `
Hello ${usernamePrimatelj},

You have a new reservation request for 
${datumRez}, ${vrijemePocetak} - ${vrijemeKraj} on terrain ${imeTeren} (ID: ${terenID})
coming from ${poslanoZbogUsername}.

<a href="/home>Home</a>
Click here to confirm, or here to deny the reservation.

Thanks,
PadelSync
`,
    obavijestORezervacijiKlub: (usernamePrimatelj, poslanoZbogUsername, datumRez, vrijemePocetak, vrijemeKraj, terenID, imeTeren) =>`
Hello ${usernamePrimatelj},

You have a new reservation for 
${datumRez}, ${vrijemePocetak} - ${vrijemeKraj} on terrain ${imeTeren} (ID: ${terenID})
coming from ${poslanoZbogUsername}.

Thanks,
PadelSync
`,
    obavijestOOtkazivanjuKlub: (usernamePrimatelj, poslanoZbogUsername, datumRez, vrijemePocetak, vrijemeKraj, terenID, imeTeren) =>`
Hello ${usernamePrimatelj},

The reservation for 
${datumRez}, ${vrijemePocetak} - ${vrijemeKraj} on terrain ${imeTeren} (ID: ${terenID})
was sadly canceled.

Thanks,
PadelSync
`,
    obavijestORezervacijiIgrac: (usernamePrimatelj, poslanoZbogUsername, datumRez, vrijemePocetak, vrijemeKraj, terenID, imeTeren) =>`
Hello ${usernamePrimatelj},

You made a new reservation for 
${datumRez}, ${vrijemePocetak} - ${vrijemeKraj} on terrain ${imeTeren}
at club ${poslanoZbogUsername}.

Thanks,
PadelSync
`,
    obavijestOOtkazivanjuIgrac: (usernamePrimatelj, poslanoZbogUsername, datumRez, vrijemePocetak, vrijemeKraj, terenID, imeTeren) =>`
Hello ${usernamePrimatelj},

Your reservation for 
${datumRez}, ${vrijemePocetak} - ${vrijemeKraj} on terrain ${imeTeren}
in club ${poslanoZbogUsername} was successfully canceled.

Thanks,
PadelSync
`,
    odbijenaRezervacijaIgrac: (usernamePrimatelj, poslanoZbogUsername, datumRez, vrijemePocetak, vrijemeKraj, terenID, imeTeren) =>`
Hello ${usernamePrimatelj},

Your reservation for 
${datumRez}, ${vrijemePocetak} - ${vrijemeKraj} on terrain ${imeTeren}
in club ${poslanoZbogUsername} was sadly denied.

Thanks,
PadelSync
`,
    podsjetnikZaPlacanje: (usernamePrimatelj, poslanoZbogUsername, datumRez, vrijemePocetak, vrijemeKraj, terenID, imeTeren) =>`
................
`,
};


module.exports = { templates };