INSERT INTO KORISNIK VALUES
   ('padelsynkovic', 'padelsynkovic@gmail.com', 'nistazasad'),
	('padelmaster3000', 'hrvoje.padelic@yahoo.com', 'zasadnista'),
	('marko10', 'marko10@gmail.com', 'zasadnista'),
	('padelina', 'josipar@gmail.com', 'zasadnista'),
	('ivor_je_zakon', 'ivor_ivic@outlook.com', 'zasadnista'),
	('aaaaa100', 'mihaelaaaaa@gmail.com', 'zasadnista'),
	('pktresnjevka', 'pktresnjevka@gmail.com', 'zasadnista'),
	('PadelGrom', 'padelgrom3.@gmail.com', 'zasadnista'),
	('sp1994', 'stogpadel1994@yahoo.com', 'zasadnista');



INSERT INTO IGRAC VALUES
	('padelmaster3000', NULL, 'Hrvoje', 'Padelic', NULL, 'pro'),
	('marko10', NULL, 'Marko', 'Desetic', '10:00', NULL),
	('padelina', '192', 'Josipa', 'Reket', '12:00', 'advanced'),
	('ivor_je_zakon', '666', 'Ivor', 'Ivic', NULL, 'pro'),
	('aaaaa100', NULL, 'Mihaela', NULL, NULL, 'beginner');
	
	
INSERT INTO KLUB VALUES
	('pktresnjevka', NULL, 'PK Tresnjevka', 4, 'Molimo ne nabijajte lopticu izvan terena',
		'20:00', '10:00', 3, 'Selska 17', 2, 'Prvi padel klub u Zagrebu. Vrhunski tereni i jos bolji treneri'),
		('PadelGrom', 0, 'Padel klub Grom', 1, 'Jedino pravilo je da se zabavite :D',
		'00:00', '14:00', 2, 'trg Padela Synkovica 4', 2, 'Moderni padel klub u samom centru Padelgrada. Nazalost nemamo svlacionice'),
			('sp1994', 10, 'Stog padel', NULL, 'Igraci donose vlastite rekete. Izgubljena loptica se naplacuje 3 eura',
		'22:00', '08:00', 1, 'Ilica 1', NULL, 'Stog padel: raj za sve igrace padela');
	

INSERT INTO TEREN (terenID ,tipPodloge, velicinaTeren, osvjetljenje, vanjskiUnutarnji, visinaStrop, cijenaTeren, imeTeren, username)
VALUES
(1, 'parket', 'single', 1, 'unutarnji', 4.00, 15, 'Unutarnji 1', 'pktresnjevka'),
(2, 'trava', 'double', 0, 'vanjski', NULL, 20, 'Vanjski 1', 'pktresnjevka'),
(3, 'beton', 'single', 1, 'vanjski', NULL, 22, 'Betonski teren', 'PadelGrom'),
(4, 'parket', 'single', 1, 'unutarnji', 4.20, 15, 'Mali unutranji', 'PadelGrom'),
(5, 'umjetna', 'double', 1, 'unutarnji', 5.00, 25, 'Profesionalni teren', 'sp1994'),
(6, 'parket', 'double', 1, 'unutarnji', 4.00, 18, 'Advanced playground', 'sp1994');	
	

INSERT INTO TIP_PRETPLATE (tipPretpID, pretpNaziv, pretpCijena, pretpDostupnost, levelPretplate, username, poducavanje)
VALUES
	(1, 'beginner pack', 5, 1, 2, 'pktresnjevka', NULL),
	(2, 'advanced pack', 10, 1, 3, 'pktresnjevka', NULL),
	(3, 'pro pack', 15, 1, 4, 'pktresnjevka', NULL),
	(4, 'premium', 10, 1, 2, 'PadelGrom', NULL),
	(5, 'extra premium', 20, 1, 3, 'PadelGrom', NULL),
	(6, 'stog membership', 12, 1, 3, 'sp1994', NULL);



INSERT INTO TERMIN_TJEDNI (terenID, vrijemePocetak, vrijemeKraj, danTjedan, potrebnaPretplata)
	VALUES
	(1, '10:00', '11:00', 'ponedjeljak', 0),
	(1, '11:00', '12:00', 'ponedjeljak', 0),
	(1, '12:00', '13:00', 'ponedjeljak', 0),
	(1, '13:00', '14:00', 'ponedjeljak', 0),
	(1, '14:00', '15:00', 'ponedjeljak', 2),
	(1, '15:00', '16:00', 'ponedjeljak', 2),
	(1, '10:00', '11:00', 'utorak', 2),
	(1, '11:00', '12:00', 'utorak', 0),
	(2, '15:00', '17:00', 'subota', 3),
	(3, '10:00', '11:00', 'nedjelja', 0),
	(1, '10:00', '11:00', 'subota', 0),
	(4, '12:00', '14:00', 'ponedjeljak', 0),
	(5, '12:00', '14:00', 'ponedjeljak', 2),
	(4, '12:00', '14:00', 'utorak', 0),
	(5, '16:00', '17:00', 'cetvrtak', 0),
	(3, '10:00', '11:00', 'petak', 4),
	(6, '18:00', '19:00', 'srijeda', 3),
	(6, '14:00', '15:00', 'cetvrtak', 0);


INSERT INTO ADMIN (prezimeAdmin, imeAdmin, username)
	VALUES 
	('Synkovic', 'Padel', 'padelsynkovic');
	

INSERT INTO RECENZIJA (komentar, ocjena, datumRecenzija, username, terenID)
    VALUES
    ('odlican teren', 5, '21.10.2024.', 'marko10', 1),
    ('nestalo struje', 2, '1.1.2025.', 'padelmaster3000', 1),
    ('nije lose', 3, '23.7.2024.', 'padelina', 1),
    ('', 4, '21.10.2024.', 'aaaaa100', 2),
    ('savrsenstvo', 5, '22.11.2024.', 'marko10', 3),
    ('odlicno', 5, '13.2.2025.', 'padelmaster3000', 4),
    ('solidan teren', 4, '2.7.2024.', 'ivor_je_zakon', 4);

