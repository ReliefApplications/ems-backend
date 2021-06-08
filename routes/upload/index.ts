import express from "express";
import recordReader from "../../utils/files/recordReader";
import fs from "fs"

const router = express.Router();

router.post('/records/add', async (req: any, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    console.log(req.files.sampleFile.name);
    console.log(req.files.sampleFile);
    const file = req.files.sampleFile;
    // file.mv('/Users/martin/Desktop/Stage_ReliefApp/Projets/emrs-safe-backend/records/'+file.name);

    //const file: Blob = new Blob(req.files.sampleFile.data);
    return recordReader(file.data);
    // res.send('File uploaded!');
});

export default router;
