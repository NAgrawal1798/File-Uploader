const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { Readable } = require('stream');
const path = require('path');
const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/', 'index.html'));
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static('public'));

app.post('/upload', upload.single('file'), (req, res) => {
    const { threads } = req.body;
    const fileData = req.file.buffer;
    
    const chunkSize = Math.ceil(fileData.length / threads);
    const chunks = [];

    for (let i = 0; i < threads; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        chunks.push(fileData.slice(start, end));
    }

    const uploadDir = path.join(__dirname, '../uploads');

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }

    const promises = chunks.map((chunk, index) => {
        return new Promise((resolve, reject) => {
            const stream = new Readable();
            stream.push(chunk);
            stream.push(null);

            const fileName = `chunk_${index}.bin`;
            const filePath = path.join(uploadDir, fileName);

            const writeStream = fs.createWriteStream(filePath);

            stream.pipe(writeStream);
            writeStream.on('finish', () => {
                resolve(fileName);
            });
        });
    });

    Promise.all(promises)
        .then((fileNames) => {
            res.json({ message: 'File upload complete' });
        })
        .catch((error) => {
            res.status(500).json({ error: 'Error during upload' });
        });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
