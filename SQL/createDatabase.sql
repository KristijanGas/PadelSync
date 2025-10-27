

CREATE TABLE KORISNIK
(
  username VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  passwordHash VARCHAR NOT NULL,
  PRIMARY KEY (username)
);

CREATE TABLE ADMIN
(
  prezimeAdmin VARCHAR NOT NULL,
  imeAdmin VARCHAR NOT NULL,
  username VARCHAR NOT NULL,
  PRIMARY KEY (username),
  FOREIGN KEY (username) REFERENCES KORISNIK(username)
);

CREATE TABLE IGRAC
(
  brojMob VARCHAR,
  prefVrijeme DATE,
  razZnanjaPadel VARCHAR,
  prezimeIgrac VARCHAR,
  imeIgrac VARCHAR,
  username VARCHAR NOT NULL,
  PRIMARY KEY (username),
  FOREIGN KEY (username) REFERENCES KORISNIK(username)
);

CREATE TABLE KLUB
(
  svlacionice INT,
  imeKlub VARCHAR,
  najamReketa INT,
  pravilaKlub VARCHAR,
  klubRadiDo DATE,
  klubRadiOd DATE,
  tusevi INT,
  adresaKlub VARCHAR,
  prostorZaOdmor INT,
  opisKluba VARCHAR,
  username VARCHAR NOT NULL,
  PRIMARY KEY (username),
  FOREIGN KEY (username) REFERENCES KORISNIK(username)
);

CREATE TABLE FOTO_KLUB
(
  fotoKlubOpis VARCHAR,
  fotoKlubID INTEGER PRIMARY KEY AUTOINCREMENT,
  mimeType VARCHAR,
  fotografija VARCHAR NOT NULL,
  username VARCHAR NOT NULL,
  PRIMARY KEY (fotoKlubID),
  FOREIGN KEY (username) REFERENCES KLUB(username)
);

CREATE TABLE TEREN
(
  tipPodloge VARCHAR NOT NULL,
  terenID INT NOT NULL,
  velicinaTeren VARCHAR NOT NULL,
  osvjetljenje INT NOT NULL,
  vanjskiUnutarnji VARCHAR NOT NULL,
  visinaStrop FLOAT,
  cijenaTeren FLOAT NOT NULL,
  imeTeren VARCHAR NOT NULL,
  username VARCHAR NOT NULL,
  PRIMARY KEY (terenID),
  FOREIGN KEY (username) REFERENCES KLUB(username)
);

CREATE TABLE RECENZIJA
(
  komentar VARCHAR,
  ocjena INT NOT NULL,
  datumRecenzija DATE NOT NULL,
  username VARCHAR NOT NULL,
  terenID INT NOT NULL,
  PRIMARY KEY (username, terenID),
  FOREIGN KEY (username) REFERENCES IGRAC(username),
  FOREIGN KEY (terenID) REFERENCES TEREN(terenID)
);

CREATE TABLE FOTO_TEREN
(
  fotografija VARCHAR NOT NULL,
  fotoTerenID INT NOT NULL,
  fotoTerenOpis VARCHAR,
  terenID INT NOT NULL,
  PRIMARY KEY (fotoTerenID),
  FOREIGN KEY (terenID) REFERENCES TEREN(terenID)
);

CREATE TABLE REZERVACIJA
(
  statusRez VARCHAR NOT NULL,
  rezervacijaID INT NOT NULL,
  PRIMARY KEY (rezervacijaID)
);

CREATE TABLE TIP_PRETPLATE
(
  tipPretpID INT NOT NULL,
  pretpNaziv VARCHAR NOT NULL,
  pretpCijena FLOAT NOT NULL,
  pretpDostupnost INT NOT NULL,
  levelPretplate INT NOT NULL,
  username VARCHAR NOT NULL,
  PRIMARY KEY (tipPretpID),
  FOREIGN KEY (username) REFERENCES KLUB(username)
);

CREATE TABLE PRETPLATA
(
  pretpPocetak DATE NOT NULL,
  pretpKraj DATE,
  pretpID INT NOT NULL,
  pretpPlacenaDo DATE NOT NULL,
  pretpAktivna INT NOT NULL,
  tipPretpID INT NOT NULL,
  username VARCHAR NOT NULL,
  PRIMARY KEY (pretpID),
  FOREIGN KEY (tipPretpID) REFERENCES TIP_PRETPLATE(tipPretpID),
  FOREIGN KEY (username) REFERENCES IGRAC(username)
);

CREATE TABLE TRANSAKCIJA
(
  iznos FLOAT NOT NULL,
  statusPlac VARCHAR NOT NULL,
  transakcijaID INT NOT NULL,
  nacinPlacanja VARCHAR NOT NULL,
  datumPlacanja DATE NOT NULL,
  pretpID INT NOT NULL,
  PRIMARY KEY (transakcijaID),
  FOREIGN KEY (pretpID) REFERENCES PRETPLATA(pretpID)
);

CREATE TABLE JEDNOKRATNA_REZ
(
  datumRez DATE NOT NULL,
  rezervacijaID INT NOT NULL,
  username VARCHAR NOT NULL,
  transakcijaID INT NOT NULL,
  PRIMARY KEY (rezervacijaID),
  FOREIGN KEY (rezervacijaID) REFERENCES REZERVACIJA(rezervacijaID),
  FOREIGN KEY (username) REFERENCES IGRAC(username),
  FOREIGN KEY (transakcijaID) REFERENCES TRANSAKCIJA(transakcijaID)
);

CREATE TABLE PONAVLJAJUCA_REZ
(
  rezervacijaID INT NOT NULL,
  tipPretpID INT NOT NULL,
  PRIMARY KEY (rezervacijaID),
  FOREIGN KEY (rezervacijaID) REFERENCES REZERVACIJA(rezervacijaID),
  FOREIGN KEY (tipPretpID) REFERENCES TIP_PRETPLATE(tipPretpID)
);

CREATE TABLE TERMIN_TJEDNI
(
  vrijemePocetak DATE NOT NULL,
  danTjedan VARCHAR NOT NULL,
  vrijemeKraj DATE NOT NULL,
  potrebnaPretplata INT NOT NULL,
  terenID INT NOT NULL,
  PRIMARY KEY (terenID, danTjedan, vrijemePocetak),
  FOREIGN KEY (terenID) REFERENCES TEREN(terenID)
);

CREATE TABLE OBAVIJEST
(
  tekstObavijest VARCHAR NOT NULL,
  naslovObavijest VARCHAR NOT NULL,
  datumObavijest DATE NOT NULL,
  obavijestID INT NOT NULL,
  obavOtvorena INT NOT NULL,
  usernamePrimatelj VARCHAR NOT NULL,
  poslanoZbogusername VARCHAR NOT NULL,
  rezervacijaID INT NOT NULL,
  FOREIGN KEY (usernamePrimatelj) REFERENCES KORISNIK(usernamePrimatelj),
  FOREIGN KEY (poslanoZbogusername) REFERENCES KORISNIK(poslanoZbogusername),
  FOREIGN KEY (rezervacijaID) REFERENCES REZERVACIJA(rezervacijaID),
  UNIQUE (obavijestID)
);
