CREATE VIEW KLUB_RATING (klub, klubUsername, rating) AS
SELECT imeKlub, KLUB.username, ROUND(AVG(ocjena), 2)
    FROM KLUB LEFT JOIN TEREN ON KLUB.username = TEREN.username
    LEFT JOIN RECENZIJA ON TEREN.terenID = RECENZIJA.terenID
    GROUP BY KLUB.username
    ORDER BY AVG(ocjena) DESC;