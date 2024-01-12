import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import records from "./routes/record.mjs";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import details from "./routes/players.mjs";


const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin"}));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "1000mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "1000mb", extended: true }));

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/record", records);
app.use("/detail", details);
// app.use("/edit/:id", details);


//routing
app.get("/", async (req, res) => {
    res.send("Hello, World").status(200);
});


//start the express server
app.listen(PORT, () => {
    console.log(`server is running on port: http://localhost:${PORT}`);
});

