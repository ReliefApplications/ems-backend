import express from "express";
import errors from "../../const/errors";

// const FormData = require('form-data');
// var fs = require('fs');

const router = express.Router();

router.use(express.urlencoded());

router.post('/records/add', async (req, res) => {
    console.log("***HELLO***");
    if (req) {
        console.log("**********");
        console.log("**********");
        console.log(req.body);
        console.log(req.body.name);
        console.log(req.body.value);
        // const form = new FormData();
        const data: FormData = req.body;
        console.log(data);
        console.log(data.get('file_upload'));
        // console.log(data.name);
        console.log(data.toString());
        // console.log(data.value);

        console.log(req.query);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
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
