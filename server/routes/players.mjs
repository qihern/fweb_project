import express from "express";
import multer from "multer";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
// import { Jwt } from "jsonwebtoken";
const app = express();
// const fs = require('fs');
// const path = require('path');
// const util = require('util');
import path from 'path';
import fs from 'fs';
import util from 'util';
import jwt from "jsonwebtoken";

const readFileAsync = util.promisify(fs.readFile);


app.use(express.static('uploads'));
app.use('/uploads', express.static('uploads'));

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // cb(null, 'uploads/'); // Specify the directory where files will be stored
        cb(null, 'uploads'); // Specify the destination folder
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// const filefilter = (req, file, cb) => {
//     if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg'
//         || file.mimetype === 'image/jpeg') {
//         cb(null, true);
//     } else {
//         cb(null, false);
//     }
// }

// const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// const upload = multer({ storage: storage, fileFilter: filefilter })
app.use(bodyParser.json({ limit: '100mb' }));
// This middleware is used to handle file uploads
const uploadMiddleware = upload.fields([{ name: 'profilePicture' }, { name: 'standingPicture' }]);





router.get("/", async (req, res) => {
    try {
        const collection = await db.collection("details");
        const results = await collection.find({}).toArray();

        // Process each result and convert images to base64
        const processedResults = await Promise.all(results.map(async (result) => {
            const profilePicturePath = result.profilePicture[0].path;
            const standingPicturePath = result.standingPicture[0].path;

            const profilePictureBase64 = await readAndConvertToBase64(profilePicturePath);
            const standingPictureBase64 = await readAndConvertToBase64(standingPicturePath);

            return {
                ...result,
                profilePicture: profilePictureBase64,
                standingPicture: standingPictureBase64
            };
        }));

        // console.log("Processed Results", processedResults[0]);
        res.send(processedResults).status(200);
    } catch (err) {
        console.log(err);
        res.status(500).send("error");
    }
});

async function readAndConvertToBase64(filePath) {
    try {
        const data = await readFileAsync(filePath);
        const base64 = Buffer.from(data).toString('base64');
        return base64;
    } catch (error) {
        console.error(`Error reading or converting file to base64: ${error.message}`);
        throw error;
    }
}



//This section will help you get a single record by id
router.get("/:id", async (req, res) => {
    try {
        const collection = await db.collection("details");
        // const results = await collection.find({}).toArray();
        const query = { _id: new ObjectId(req.params.id) };
        const result = await collection.findOne(query);

        if (!result) {
            res.send("Not Found").status(404);
        } else {
            // Convert images to base64 as needed
            const profilePicturePath = result.profilePicture[0].path;
            const standingPicturePath = result.standingPicture[0].path;

            const profilePictureBase64 = await readAndConvertToBase64(profilePicturePath);
            const standingPictureBase64 = await readAndConvertToBase64(standingPicturePath);

            // Add base64 images to the result
            const processedResult = {
                ...result,
                profilePicture: profilePictureBase64,
                standingPicture: standingPictureBase64
            };

            res.send(processedResult).status(200);
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("error");
    }
});


// This section will help you login current player 
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Validate user credentials against the database
    const collection = await db.collection("details");
    const result = await collection.findOne({ email });

    if (!result || result.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    // User is authenticated, generate a JWT token
    const token = jwt.sign({ email: result.email }, 'your_secret_key');
    const response = { message: "Login successful" };

    // Send the token in the response
    res.status(200).json({ token });
});



// // This section will help you create a new player (register)
router.post("/", uploadMiddleware, async (req, res, next) => {
    try {
        // Check if the email or name already exists in the database
        const collection = await db.collection("details");
        const existingUser = await collection.findOne({ $or: [{ email: req.body.email }, { name: req.body.name }] });

        if (existingUser) {
            if (existingUser.email === req.body.email) {
                res.status(400).json({ message: "Email already taken, please log in or try another one" });
            } else {
                res.status(400).json({ message: "Name already taken, please log in or try another one" });
            }
        } else {
            // Check if the passwords match
            if (req.body.password !== req.body.confirmPassword) {
                return res.status(400).json({ message: "Passwords do not match" });
            }
            const newDocument = {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                confirmPassword: req.body.confirmPassword,
                year: req.body.year,
                age: req.body.age,
                school: req.body.school,
                diploma: req.body.diploma,
                number: req.body.number,
                position: req.body.position,
                appearances: req.body.appearances,
                totalGoals: req.body.totalGoals,
                profilePicture: req.files.profilePicture,
                standingPicture: req.files.standingPicture,
                // profilePicture: req.files['profilePicture'][0].path.replace(/\\/g, '/'),
                // profilePicture: req.file.path,
                // standingPicture: req.files['standingPicture'][0].path.replace(/\\/g, '/'),
                // fileData: bufferStream.read(),
                // profilePicture: req.base64ProfilePicture,
                // standingPicture: req.base64StandingPicture,
            };
            // Save the user details to the database
            let collection = await db.collection("details");
            let result = await collection.insertOne(newDocument);

            // Create and return a JWT token in the response
            const token = jwt.sign({ email: req.body.email }, 'your_secret_key');

            // Send a success response with the token
            res.status(201).json({ message: "Player created successfully", token });
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).send("Error creating Player");
    }
});




router.patch("/update", async (req, res) => {
    console.log("reached the server");
    try {
        const { id, ...updates } = req.body;       // Extract id and other updates
        const query = { _id: new ObjectId(id) };
        console.log(query);

        const collection = await db.collection("details");
        const result = await collection.updateOne(query, { $set: updates });

        if (result.modifiedCount === 0) {
            res.status(404).send("Not Found");
        } else {
            // Fetch the updated record
            const updatedDetails = await collection.findOne(query);

            if (!updatedDetails) {
                console.error('Error: Document not found after update');
                res.status(404).send("Not Found");
            } else {
                // Optionally, convert images to base64 here if needed

                // Log the updated record
                console.log("Updated Result", updatedDetails);

                // Send the updated record as the response
                res.status(200).json(updatedDetails);
            }
        }
    } catch (error) {
        console.error('Error during update:', error);
        res.status(500).send(error.message || 'Internal Server Error');
    }
});



//This section will help you delete a record by id
router.delete("/:id", async (req, res) => {
    const query = { _id: new ObjectId(req.params.id) };

    const collection = db.collection("details");
    let result = await collection.deleteOne(query);
    res.send(result).status(200);
});



router.post("/register", upload.single("profilePicture"), async (req, res) => {
    try {
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt)
        const newDocument = new Document({
            username: req.body.username,
            email: req.body.email,
            dob: req.body.dob,
            password: passwordHash,
            confirmPassword: req.body.confirmPassword,
            profilePicture: req.body.profilePicture,
        });
        const savedDocument = await newDocument.save();
        res.status(201).json(savedDocument);
        const collection = db.collection("register");
        let result = await collection.insertOne(newDocument);
        res.send(result).status(204);

    } catch (error) {
        res.status(500).json({ error: err.message });
    }
})

export default router;
