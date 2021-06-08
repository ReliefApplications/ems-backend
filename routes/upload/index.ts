import express from "express";
import errors from "../../const/errors";
// import FormData from "form-data";
// import fs from "fs";

import fileUpload from "express-fileupload";
import bodyParser from "body-parser";

// import busyBoy from "connect-busboy";
// import bodyParser from "body-parser";
// import * as path from "path";
// import multer from "multer";

const router = express.Router();

// router.use(express.json());
router.use(express.urlencoded());
router.use(fileUpload());
// router.use(bodyParser.json())


// router.use(busyBoy);
// router.use(multer);
// const upload = multer({ dest: 'uploads/' })



// let data = new FormData();
// let data: FormData = null ;

// let sampleFile;
// let uploadPath;

router.post('/records/add', async (req: any, res) => {
    // console.log("***HELLO***");
    // if (req) {
    //     console.log(req);
    //     console.log("**********");
    //     console.log("**********");
    //     console.log(req.body);
    //     console.log(req.body.name);
    //     console.log(req.body.value);
    //     // const form = new FormData();
    //     console.log('req.body');
    //     console.log(req.body);
    //     console.log(JSON.stringify(req.body));
    //     // console.log(JSON.parse(req.body));
    //     data = req.body;
    //     console.log(data);
    //     console.log(data.getBuffer());
    //     console.log(data.getBoundary());
    //
    //     // console.log(data.name);
    //     console.log(data.toString());
    //     // console.log(data.value);
    //
    //     console.log(req.query);
    //
    //     res.status(200).send('It works!');
    // } else {
    //     res.status(404).send(errors.dataNotFound);
    // }


    // if (!req.files || Object.keys(req.files).length === 0) {
    //     return res.status(400).send('No files were uploaded.');
    // }
    //
    // // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    // sampleFile = req.files.sampleFile;
    // uploadPath = __dirname + '/somewhere/on/your/server/' + sampleFile.name;
    //
    // // Use the mv() method to place the file somewhere on your server
    // sampleFile.mv(uploadPath, function(err) {
    //     if (err)
    //         return res.status(500).send(err);
    //
    //     res.send('File uploaded!');
    // });
    console.log("***** hello *****");
    console.log(req.file);
    console.log(req.files);
    console.log(req.body);
    console.log("***** ***** *****");

    res.send(req.body);
});

router.get('/hello/boi', async (req, res) => {
    console.log("***HELLO***");
    if (req) {
        console.log(req);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
});

export default router;
