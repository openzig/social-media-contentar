import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import smartReplyRouter from "./routes/smart_reply";

dotenv.config();

const app = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 5000;

app.use(cors());
app.use(express.json());

// routes
app.use("/api/v1/smart_reply", smartReplyRouter);

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});