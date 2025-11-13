const sharp = require("sharp");

async function processImages(req, res, next) {
    try {
        if (!req.files || req.files.length === 0) {
            return next();
        }

        const processedFiles = [];

        for (const file of req.files) {
            const outputBuffer = await sharp(file.buffer)
                .resize({ width: 1920, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();

            processedFiles.push({
                ...file,
                buffer: outputBuffer,     // ZAMJENA OBRADOM
                mimetype: "image/jpeg",   // jer smo pretvorili u jpeg
            });
        }

        req.processedFiles = processedFiles;
        next();

    } catch (err) {
        console.error("❌ Error processing images:", err);
        res.status(500).json({ error: "Error processing images" });
    }
}

module.exports = processImages;
