const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Backend funcionando ');
});

app.listen(3000,"0.0.0.0", () => {
  console.log('Servidor en http://192.168.237.26:3000');
});
