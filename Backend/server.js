require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from source folder
app.use("/source", express.static(path.join(__dirname, "source")));

// Routes
app.use("/api/chat", require("./Routes/chat.routes"));
app.use("/api/solutions", require("./Routes/solution.routes"));
app.use("/api/upload", require("./Routes/upload.routes"));
app.use("/api/unanswered", require("./Routes/unanswered.routes"));

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);