const fs = require('fs');
const Papa = require('papaparse');
const puppeteer = require('puppeteer');
const path = require('path');
let downloadPath = path.resolve(__dirname, './puppeteer');

//El filename tambien funciona como path
//Si el archivo esta en la misma carpeta que ESTE archivo, solo pasen el nombre, si no, deben pasar la ruta relativa ../../filename
function csvToJSON(filename) {
  //Leemos el archivo
  const data = fs.readFileSync(filename, 'utf8');
  //Nos genera un strig y a este lo podemos separar en saltos de linea
  let newFile = data.split(/\n/);
  //con la siguiente linea obtenemos los datos de las 3 primeras filas (y de paso los separamos del resto)
  let extra_data = newFile.splice(0, 3);
  //lo volvemos a juntar
  newFile = newFile.join('\n');

  //y la siguiente linea nos convierte el string a json
  const resp = { data: Papa.parse(newFile, { header: true }).data };

  //ahora simplemente agregamos los datos restantes por si queremos usarlos para algo luego
  resp.extra_data = {};
  for (const string of extra_data) {
    const _data = string.split(',');
    resp.extra_data[_data[0]] = _data[1];
  }

  return resp;
}

const getTodayJSON = async () => {
  // console.log(downloadPath);
  const nombreArchivo = await executePuppeteer();
  console.log('File downloaded');
  return csvToJSON(`./puppeteer/${nombreArchivo}`);
};

const executePuppeteer = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: downloadPath,
  });

  const page = await browser.newPage();

  console.log('PUPPET OPEN WEBSITE');
  await page.goto('https://covidstats.com.ar/exportar');

  console.log('PUPPET TYPING INPUT');
  await page
    .type('.select2-search__field', 'La Rioja')
    .then((a) => page.keyboard.press('Enter'));

  console.log('PUPPET CLICK EXPORTAR');
  await page.click('#exportar', { clickCount: 1 });

  console.log('PUPPET WAITING LINK GENERATION');
  await page.waitForFunction(
    "document.querySelector('#descargar') && document.querySelector('#descargar').style.display != 'none'"
  );
  console.log('NO ESPERO NI ACA');

  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  const nombreArchivo = await page.evaluate(
    (el) => el.download,
    await page.$('#descargar')
  );
  await page.click('#descargar', { clickCount: 1 });

  console.log('PUPPET WAITING FOR DOWNLOAD');
  await page.waitForTimeout(5000);
  await browser.close();

  return nombreArchivo;
};

module.exports = { getTodayJSON };
