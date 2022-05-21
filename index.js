const express = require('express');
const cors = require('cors');
const res = require('express/lib/response');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// Middlewear 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Manufacturer');
});

// listening server 
app.listen(port, () => {
    console.log('Manufacturer running on port', port);
});